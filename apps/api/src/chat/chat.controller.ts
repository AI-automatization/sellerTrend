import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { PlanGuard } from '../billing/plan.guard';
import { RequiresPlan } from '../billing/requires-plan.decorator';
import { AiThrottlerGuard } from '../common/guards/ai-throttler.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatFeedbackDto } from './dto/chat-feedback.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard, BillingGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @UseGuards(PlanGuard, AiThrottlerGuard)
  @RequiresPlan('MAX')
  @HttpCode(200)
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('account_id') accountId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of this.chatService.sendMessage(
        accountId,
        userId,
        dto.message,
        dto.conversation_id,
      )) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Get('conversations')
  async getConversations(@CurrentUser('account_id') accountId: string) {
    return this.chatService.getConversations(accountId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.chatService.getMessages(conversationId, accountId);
  }

  @Post('messages/:id/feedback')
  async addFeedback(
    @Param('id') messageId: string,
    @CurrentUser('account_id') accountId: string,
    @Body() dto: ChatFeedbackDto,
  ) {
    return this.chatService.addFeedback(messageId, accountId, dto.feedback, dto.feedback_text);
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    await this.chatService.deleteConversation(conversationId, accountId);
    return { success: true };
  }
}
