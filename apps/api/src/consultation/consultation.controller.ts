import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConsultationService } from './consultation.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { BookConsultationDto } from './dto/book-consultation.dto';
import { RateConsultationDto } from './dto/rate-consultation.dto';

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
    @Body() dto: CreateConsultationDto,
  ) {
    return this.consultationService.createListing(accountId, dto);
  }

  @Post(':id/book')
  book(
    @CurrentUser('account_id') accountId: string,
    @Param('id') id: string,
    @Body() dto: BookConsultationDto,
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
    @Body() dto: RateConsultationDto,
  ) {
    return this.consultationService.rate(accountId, id, dto.rating, dto.review);
  }
}
