import { Injectable } from '@nestjs/common';
import { calculateProfit, ProfitInput, calculateElasticity, ElasticityInput } from '@uzum/utils';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ToolsService {
  constructor(private readonly aiService: AiService) {}

  calculateProfit(input: ProfitInput) {
    return calculateProfit(input);
  }

  calculateElasticity(input: ElasticityInput) {
    return calculateElasticity(input);
  }

  generateDescription(opts: {
    title: string;
    attributes?: Record<string, string | null>;
    category?: string;
    keywords?: string[];
  }) {
    return this.aiService.generateDescription(opts);
  }

  analyzeSentiment(opts: { productTitle: string; reviews: string[] }) {
    return this.aiService.analyzeSentiment(opts);
  }
}
