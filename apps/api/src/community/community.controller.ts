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
import { CreateInsightDto } from './dto/create-insight.dto';
import { VoteInsightDto } from './dto/vote-insight.dto';

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
    @Body() body: CreateInsightDto,
  ) {
    return this.communityService.createInsight(accountId, body);
  }

  /** List insights (optionally filter by category, paginated) */
  @Get('insights')
  listInsights(
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.listInsights(
      category,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** Vote on an insight */
  @Post('insights/:id/vote')
  vote(
    @CurrentUser('account_id') accountId: string,
    @Param('id') insightId: string,
    @Body() body: VoteInsightDto,
  ) {
    return this.communityService.vote(accountId, insightId, body.vote);
  }

  /** Get distinct categories */
  @Get('categories')
  getCategories() {
    return this.communityService.getCategories();
  }
}
