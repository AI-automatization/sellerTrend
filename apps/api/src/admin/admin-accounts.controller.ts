import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminAccountService } from './admin-account.service';
import { AdminUserService } from './admin-user.service';
import { AdminUserActivityService } from './admin-user-activity.service';
import { AdminUserDataService } from './admin-user-data.service';
import {
  CreateAccountDto,
  UpdateAccountStatusDto,
  UpdateAccountPhoneDto,
  BulkAccountActionDto,
  SetPlanDto,
} from './dto/account.dto';
import { CreateUserDto, ChangePasswordDto, UpdateRoleDto } from './dto/user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminAccountsController {
  constructor(
    private readonly accountService: AdminAccountService,
    private readonly userService: AdminUserService,
    private readonly userActivityService: AdminUserActivityService,
    private readonly userDataService: AdminUserDataService,
  ) {}

  // ── ACCOUNT ENDPOINTS ──

  @Get('accounts')
  listAccounts(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountService.listAccounts(page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
  }

  @Get('accounts/:id')
  getAccount(@Param('id') id: string) {
    return this.accountService.getAccount(id);
  }

  @Post('accounts')
  createAccount(@Body() body: CreateAccountDto, @CurrentUser('id') adminUserId: string) {
    return this.accountService.createAccount(body.company_name, body.email, body.password, body.role, adminUserId);
  }

  @Patch('accounts/:id/status')
  updateAccountStatus(
    @Param('id') accountId: string,
    @Body() body: UpdateAccountStatusDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.accountService.updateAccountStatus(accountId, body.status, adminUserId);
  }

  @Patch('accounts/:id/phone')
  updateAccountPhone(
    @Param('id') accountId: string,
    @Body() body: UpdateAccountPhoneDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.accountService.updateAccountPhone(accountId, body.phone, adminUserId);
  }

  @Patch('accounts/:id/plan')
  @Roles('SUPER_ADMIN', 'ADMIN')
  setPlan(@Param('id') id: string, @Body() body: SetPlanDto, @CurrentUser('id') adminUserId: string) {
    return this.accountService.setPlan(id, body.plan, adminUserId);
  }

  @Post('accounts/bulk')
  bulkAction(@Body() body: BulkAccountActionDto, @CurrentUser('id') adminUserId: string) {
    return this.accountService.bulkAccountAction(body.account_ids, body.action, { adminUserId });
  }

  @Get('accounts/:id/transactions')
  getAccountTransactions(
    @Param('id') accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userDataService.getAccountTransactions(accountId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Post('accounts/:id/users')
  createUser(
    @Param('id') accountId: string,
    @Body() body: CreateUserDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.userService.createUser(accountId, body.email, body.password, body.role, adminUserId);
  }

  // ── USER ENDPOINTS ──

  @Get('users')
  listUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.listUsers(page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
  }

  @Patch('users/:id/password')
  changePassword(
    @Param('id') userId: string,
    @Body() body: ChangePasswordDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.userService.changeUserPassword(userId, body.password, adminUserId);
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id') userId: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.userService.updateUserRole(userId, body.role, adminUserId);
  }

  @Patch('users/:id/toggle-active')
  toggleActive(@Param('id') userId: string, @CurrentUser('id') adminUserId: string) {
    return this.userService.toggleUserActive(userId, adminUserId);
  }

  @Post('users/:id/impersonate')
  impersonateUser(@Param('id') userId: string) {
    return this.userService.impersonateUser(userId);
  }

  // ── USER MONITORING ENDPOINTS ──

  @Get('users/:id/activity')
  getUserActivity(
    @Param('id') userId: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userActivityService.getUserActivity(
      userId, action,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('users/:id/tracked-products')
  getUserTrackedProducts(@Param('id') userId: string) {
    return this.userDataService.getUserTrackedProducts(userId);
  }

  @Get('users/:id/sessions')
  getUserSessions(@Param('id') userId: string, @Query('limit') limit?: string) {
    return this.userActivityService.getUserSessions(userId, limit ? parseInt(limit) : 20);
  }

  @Get('users/:id/usage')
  getUserUsage(@Param('id') userId: string) {
    return this.userActivityService.getUserUsage(userId);
  }

  @Get('users/:id/portfolio-summary')
  getUserPortfolioSummary(@Param('id') userId: string) {
    return this.userDataService.getUserPortfolioSummary(userId);
  }

  @Get('users/:id/discovery-results')
  getUserDiscoveryResults(@Param('id') userId: string) {
    return this.userDataService.getUserDiscoveryResults(userId);
  }

  @Get('users/:id/campaigns')
  getUserCampaigns(@Param('id') userId: string) {
    return this.userDataService.getUserCampaigns(userId);
  }

  @Get('users/:id/competitor-stats')
  getUserCompetitorStats(@Param('id') userId: string) {
    return this.userDataService.getUserCompetitorStats(userId);
  }
}
