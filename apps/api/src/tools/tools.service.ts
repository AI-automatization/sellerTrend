import { Injectable } from '@nestjs/common';
import { calculateProfit, ProfitInput } from '@uzum/utils';

@Injectable()
export class ToolsService {
  calculateProfit(input: ProfitInput) {
    return calculateProfit(input);
  }
}
