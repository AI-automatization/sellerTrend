import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/** Plan pricing constants (som/month) — must match worker PLAN_PRICES */
const PLANS = [
  { id: 'FREE', name: 'Bepul', price: 0, features: ['3 ta mahsulot', 'Asosiy tahlil'] },
  { id: 'PRO', name: 'Pro', price: 150000, features: ['20 ta mahsulot', 'AI tahlil', 'Signallar'] },
  { id: 'MAX', name: 'Max', price: 350000, features: ['100 ta mahsulot', 'Barcha funksiyalar', 'API'] },
  { id: 'COMPANY', name: 'Kompaniya', price: 990000, features: ['Cheksiz', 'Jamoa', 'Shaxsiy yordam'] },
] as const;

/**
 * Public billing endpoints — no authentication required.
 * Separate controller to avoid class-level JwtAuthGuard from BillingController.
 */
@ApiTags('billing')
@Controller('billing')
export class BillingPublicController {
  @Get('plans')
  getPlans() {
    return { plans: PLANS };
  }
}
