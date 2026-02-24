import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConsultationService } from './consultation.service';

@ApiTags('consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('consultations')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Get()
  listAvailable(@Query('category') category?: string) {
    return this.consultationService.listAvailable(category);
  }

  @Get('categories')
  getCategories() {
    return this.consultationService.getCategories();
  }

  @Get('my-listings')
  myListings(@CurrentUser('account_id') accountId: string) {
    return this.consultationService.getMyListings(accountId);
  }

  @Get('my-bookings')
  myBookings(@CurrentUser('account_id') accountId: string) {
    return this.consultationService.getMyBookings(accountId);
  }

  @Post()
  create(
    @CurrentUser('account_id') accountId: string,
    @Body() dto: {
      title: string;
      description?: string;
      category: string;
      price_uzs: number;
      duration_min?: number;
    },
  ) {
    return this.consultationService.createListing(accountId, dto);
  }

  @Post(':id/book')
  book(
    @CurrentUser('account_id') accountId: string,
    @Param('id') id: string,
    @Body() dto: { scheduled_at: string },
  ) {
    return this.consultationService.book(accountId, id, dto.scheduled_at);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser('account_id') accountId: string,
    @Param('id') id: string,
  ) {
    return this.consultationService.complete(accountId, id);
  }

  @Post(':id/rate')
  rate(
    @CurrentUser('account_id') accountId: string,
    @Param('id') id: string,
    @Body() dto: { rating: number; review?: string },
  ) {
    return this.consultationService.rate(accountId, id, dto.rating, dto.review);
  }
}
