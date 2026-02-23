import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TeamService } from './team.service';

@ApiTags('team')
@ApiBearerAuth()
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  /** Invite a team member */
  @Post('invite')
  @UseGuards(JwtAuthGuard, BillingGuard)
  inviteMember(
    @CurrentUser('account_id') accountId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { email: string; role?: string },
  ) {
    return this.teamService.inviteMember(accountId, userId, body);
  }

  /** List all invites */
  @Get('invites')
  @UseGuards(JwtAuthGuard, BillingGuard)
  listInvites(@CurrentUser('account_id') accountId: string) {
    return this.teamService.listInvites(accountId);
  }

  /** List team members */
  @Get('members')
  @UseGuards(JwtAuthGuard, BillingGuard)
  listMembers(@CurrentUser('account_id') accountId: string) {
    return this.teamService.listTeamMembers(accountId);
  }

  /** Accept invite by token — NO auth needed */
  @Post('accept/:token')
  acceptInvite(@Param('token') token: string) {
    return this.teamService.acceptInvite(token);
  }

  /** Cancel a pending invite */
  @Delete('invites/:id')
  @UseGuards(JwtAuthGuard, BillingGuard)
  cancelInvite(
    @CurrentUser('account_id') accountId: string,
    @Param('id') inviteId: string,
  ) {
    return this.teamService.cancelInvite(accountId, inviteId);
  }
}
