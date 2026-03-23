import { Injectable, Logger } from '@nestjs/common';
import { ChatIntent, ClassifiedIntent } from './types/chat.types';

@Injectable()
export class ChatClassifierService {
  private readonly logger = new Logger(ChatClassifierService.name);

  private readonly INTENT_KEYWORDS: Record<ChatIntent, string[]> = {
    [ChatIntent.PRODUCT_ANALYSIS]: [
      'tahlil', 'analiz', 'mahsulot', 'tovar', 'ko\'rsat', 'holat', 'qanday',
      'анализ', 'товар', 'продукт', 'покажи', 'состояние',
      'analysis', 'product', 'analyze', 'show', 'status', 'detail',
    ],
    [ChatIntent.CATEGORY_TREND]: [
      'kategoriya', 'trend', 'lider', 'top', 'o\'sish',
      'категория', 'тренд', 'лидер', 'рост',
      'category', 'trending', 'leader', 'growth', 'leaderboard',
    ],
    [ChatIntent.PRICE_ADVICE]: [
      'narx', 'chegirma', 'baho', 'arzon', 'qimmat', 'flash',
      'цена', 'скидка', 'дешев', 'дорог',
      'price', 'discount', 'cheap', 'expensive', 'flash sale',
    ],
    [ChatIntent.RECOMMENDATION]: [
      'tavsiya', 'maslahat', 'nima sotay', 'nima qo\'shay',
      'рекомендация', 'совет', 'что продавать',
      'recommend', 'suggest', 'what to sell', 'advice',
    ],
    [ChatIntent.DEAD_STOCK]: [
      'sotilmay', 'qotib', 'ombor', 'stok', 'yotib',
      'не продается', 'залежал', 'склад', 'мертвый',
      'dead stock', 'not selling', 'stuck', 'slow moving',
    ],
    [ChatIntent.COMPETITOR]: [
      'raqib', 'raqobat', 'kannibal', 'o\'xshash',
      'конкурент', 'каннибализ', 'похож',
      'competitor', 'competition', 'cannibalization', 'similar',
    ],
    [ChatIntent.REVENUE]: [
      'daromad', 'foyda', 'tushum',
      'доход', 'выручка', 'прибыль', 'маржа',
      'revenue', 'profit', 'income', 'margin', 'earnings',
    ],
    [ChatIntent.FORECAST]: [
      'bashorat', 'prognoz', 'kelasi hafta', 'kelajak',
      'прогноз', 'следующая неделя', 'будущ',
      'forecast', 'predict', 'next week', 'future',
    ],
    [ChatIntent.NICHE]: [
      'niche', 'nisha', 'bo\'sh joy', 'imkoniyat', 'kam raqobat',
      'ниша', 'возможность', 'мало конкурент',
      'opportunity', 'gap', 'low competition', 'untapped',
    ],
    [ChatIntent.GENERAL]: [],
  };

  classify(message: string, trackedProductIds: bigint[]): ClassifiedIntent {
    const lower = message.toLowerCase();

    // 1. Product ID extraction — 5+ digit numbers = product ID
    const mentionedIds: bigint[] = [];
    const numberMatches = message.match(/\b\d{5,}\b/g);
    if (numberMatches) {
      for (const num of numberMatches) {
        const id = BigInt(num);
        if (trackedProductIds.includes(id)) {
          mentionedIds.push(id);
        }
      }
    }

    // 2. Intent scoring
    let bestIntent = ChatIntent.GENERAL;
    let bestScore = 0;
    const bestKeywords: string[] = [];

    for (const [intent, keywords] of Object.entries(this.INTENT_KEYWORDS)) {
      if (intent === ChatIntent.GENERAL) continue;
      const matched = keywords.filter(kw => lower.includes(kw));
      if (matched.length > bestScore) {
        bestScore = matched.length;
        bestIntent = intent as ChatIntent;
        bestKeywords.length = 0;
        bestKeywords.push(...matched);
      }
    }

    const confidence = bestScore > 0 ? Math.min(bestScore / 3, 1) : 0;

    this.logger.debug(`classify: "${message.slice(0, 40)}" → ${bestIntent} (${confidence.toFixed(2)})`);

    return {
      intent: bestIntent,
      confidence,
      product_ids: mentionedIds.length > 0 ? mentionedIds : trackedProductIds.slice(0, 5),
      keywords_matched: bestKeywords,
    };
  }
}
