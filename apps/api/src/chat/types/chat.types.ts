export enum ChatIntent {
  PRODUCT_ANALYSIS = 'PRODUCT_ANALYSIS',
  CATEGORY_TREND = 'CATEGORY_TREND',
  PRICE_ADVICE = 'PRICE_ADVICE',
  RECOMMENDATION = 'RECOMMENDATION',
  DEAD_STOCK = 'DEAD_STOCK',
  COMPETITOR = 'COMPETITOR',
  REVENUE = 'REVENUE',
  FORECAST = 'FORECAST',
  NICHE = 'NICHE',
  GENERAL = 'GENERAL',
}

export interface ClassifiedIntent {
  intent: ChatIntent;
  confidence: number;
  product_ids: bigint[];
  keywords_matched: string[];
}

export interface RetrievedContext {
  intent: ChatIntent;
  summary: string;
  data: Record<string, unknown>;
  token_estimate: number;
  sources: string[];
}

export interface ChatMessageDto {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface SendMessageDto {
  conversation_id?: string;
  message: string;
}

export interface FeedbackDto {
  message_id: string;
  feedback: 'UP' | 'DOWN';
  feedback_text?: string;
}
