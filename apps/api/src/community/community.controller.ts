import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommunityService } from './community.service';

@ApiTags('community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  /** Create a new insight */
  @Post('insights')
  createInsight(
    @CurrentUser('account_id') accountId: string,
    @Body() body: { title: string; content: string; category: string },
  ) {
    return this.communityService.createInsight(accountId, body);
  }

  /** List insights (optionally filter by category) */
  @Get('insights')
  listInsights(@Query('category') category?: string) {
    return this.communityService.listInsights(category);
  }

  /** Vote on an insight */
  @Post('insights/:id/vote')
  vote(
    @CurrentUser('account_id') accountId: string,
    @Param('id') insightId: string,
    @Body() body: { vote: number },
  ) {
    return this.communityService.vote(accountId, insightId, body.vote);
  }

  /** Get distinct categories */
  @Get('categories')
  getCategories() {
    return this.communityService.getCategories();
  }
}
