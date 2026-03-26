import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ChatClassifierService } from './chat-classifier.service';
import { ChatRetrieverService } from './chat-retriever.service';
import { ChatIntent, ClassifiedIntent } from './types/chat.types';
import { FeedbackValue } from './dto/chat-feedback.dto';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';
const MAX_HISTORY = 10;
const MAX_CONVERSATIONS = 50;

const COMPLEX_INTENTS: ChatIntent[] = [
  ChatIntent.NICHE,
  ChatIntent.COMPETITOR,
  ChatIntent.FORECAST,
];

const SYSTEM_PROMPT = `Sen VENTRA — Uzum.uz marketplace uchun professional bozor tahlilchisisan.
Vazifang: sotuvchilarga mahsulot tahlili, trend bashorati, narx maslahati va strategik yo'l-yo'riq berish.

QOIDALAR:
- Asosan O'zbek tilida javob ber (foydalanuvchi qaysi tilda yozsa, shu tilda)
- Raqamlarni aniq ko'rsat (narx, foiz, soni)
- Qisqa va foydali javob ber — 2-3 paragraf max
- Agar ma'lumot yetarli bo'lmasa, shuni ayt
- Hech qachon to'qima — faqat berilgan kontekst asosida javob ber`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly classifier: ChatClassifierService,
    private readonly retriever: ChatRetrieverService,
    private readonly aiService: AiService,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async *sendMessage(
    accountId: string,
    userId: string,
    message: string,
    conversationId?: string,
  ): AsyncGenerator<string> {
    // 1. Quota check
    await this.aiService.checkAiQuota(accountId);

    // 2. Conversation
    const conversation = conversationId
      ? await this.getConversation(conversationId, accountId)
      : await this.createConversation(accountId, userId, message);

    // 3. Save user message
    await this.prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    // 4. Tracked product IDs
    const trackedProducts = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      select: { product_id: true },
    });
    const trackedIds = trackedProducts.map(tp => tp.product_id);

    // 5. Classify
    let classified: ClassifiedIntent;
    try {
      classified = this.classifier.classify(message, trackedIds);
    } catch {
      this.logger.warn(`Classify failed, GENERAL fallback`);
      classified = { intent: ChatIntent.GENERAL, confidence: 0, product_ids: trackedIds.slice(0, 5) as bigint[], keywords_matched: [] };
    }

    // 6. Retrieve context
    const context = await this.retriever.retrieve(classified, accountId);

    // 7. History (last 10 messages, reversed for chronological order)
    const history = await this.prisma.chatMessage.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'desc' },
      take: MAX_HISTORY,
      select: { role: true, content: true },
    });
    const messages = history.reverse().map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    // 8. Model selection
    const model = COMPLEX_INTENTS.includes(classified.intent) ? SONNET_MODEL : HAIKU_MODEL;

    // 9. System prompt with context
    const systemPrompt = `${SYSTEM_PROMPT}\n\n--- KONTEKST (real ma'lumotlar) ---\n${context.summary}`;

    // 10. Stream
    const stream = await this.anthropic.messages.stream({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    let fullResponse = '';

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullResponse += event.delta.text;
        yield event.delta.text;
      }
    }

    // 11. Get usage from final message
    const finalMessage = await stream.finalMessage();
    const inputTokens = finalMessage.usage.input_tokens;
    const outputTokens = finalMessage.usage.output_tokens;

    // 12. Cost calculation
    const isHaiku = model === HAIKU_MODEL;
    const costUsd = isHaiku
      ? (inputTokens * 0.8 + outputTokens * 4.0) / 1_000_000
      : (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000;

    // 13. Save assistant message
    await this.prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'ASSISTANT',
        content: fullResponse,
        context_json: context.data as object,
        intent: classified.intent,
        product_ids: classified.product_ids,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      },
    });

    // 14. AiUsageLog
    await this.prisma.aiUsageLog.create({
      data: {
        account_id: accountId,
        user_id: userId,
        method: 'chat',
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      },
    });

    // 15. Set title on first message
    if (!conversationId) {
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { title: message.slice(0, 100) },
      });
    }
  }

  async getConversations(accountId: string) {
    return this.prisma.chatConversation.findMany({
      where: { account_id: accountId, is_active: true },
      orderBy: { updated_at: 'desc' },
      take: MAX_CONVERSATIONS,
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        _count: { select: { messages: true } },
      },
    });
  }

  async getMessages(conversationId: string, accountId: string) {
    const conversation = await this.getConversation(conversationId, accountId);

    return this.prisma.chatMessage.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        intent: true,
        model: true,
        feedback: true,
        created_at: true,
      },
    });
  }

  async deleteConversation(conversationId: string, accountId: string) {
    await this.getConversation(conversationId, accountId);
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { is_active: false },
    });
  }

  async addFeedback(
    messageId: string,
    accountId: string,
    feedback: FeedbackValue,
    feedbackText?: string,
  ) {
    // Verify message belongs to this account
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        conversation: { account_id: accountId },
      },
    });
    if (!message) throw new NotFoundException('Message not found');

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { feedback, feedback_text: feedbackText },
    });
  }

  private async createConversation(accountId: string, userId: string, firstMessage: string) {
    // Enforce per-account limit: soft-delete oldest if at max
    const count = await this.prisma.chatConversation.count({
      where: { account_id: accountId, is_active: true },
    });

    if (count >= MAX_CONVERSATIONS) {
      const oldest = await this.prisma.chatConversation.findFirst({
        where: { account_id: accountId, is_active: true },
        orderBy: { updated_at: 'asc' },
        select: { id: true },
      });
      if (oldest) {
        await this.prisma.chatConversation.update({
          where: { id: oldest.id },
          data: { is_active: false },
        });
      }
    }

    return this.prisma.chatConversation.create({
      data: {
        account_id: accountId,
        user_id: userId,
        title: firstMessage.slice(0, 100),
      },
    });
  }

  private async getConversation(id: string, accountId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id, account_id: accountId, is_active: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }
}
