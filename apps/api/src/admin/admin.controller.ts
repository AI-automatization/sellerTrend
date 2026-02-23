import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** List all accounts */
  @Get('accounts')
  listAccounts() {
    return this.adminService.listAccounts();
  }

  /** Single account with transaction history */
  @Get('accounts/:id')
  getAccount(@Param('id') id: string) {
    return this.adminService.getAccount(id);
  }

  /** Update per-account daily_fee (null = use global default) */
  @Patch('accounts/:id/fee')
  setFee(
    @Param('id') id: string,
    @Body() body: { fee: number | null },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.setAccountDailyFee(id, body.fee, adminUserId);
  }

  /** Deposit balance to an account */
  @Post('accounts/:id/deposit')
  deposit(
    @Param('id') id: string,
    @Body() body: { amount: number; description?: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.depositToAccount(
      id,
      body.amount,
      adminUserId,
      body.description,
    );
  }

  /** Get global daily fee */
  @Get('global-fee')
  getGlobalFee() {
    return this.adminService.getGlobalFee();
  }

  /** Update global daily fee */
  @Put('global-fee')
  setGlobalFee(
    @Body() body: { fee: number },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.setGlobalFee(body.fee, adminUserId);
  }

  /** Audit log */
  @Get('audit-log')
  auditLog(@Query('limit') limit?: string) {
    return this.adminService.getAuditLog(limit ? parseInt(limit) : 50);
  }

  /** List all users across all accounts */
  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  /** Create new account + first user */
  @Post('accounts')
  createAccount(
    @Body() body: { company_name: string; email: string; password: string; role: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.createAccount(
      body.company_name,
      body.email,
      body.password,
      body.role,
      adminUserId,
    );
  }

  /** Add user to existing account */
  @Post('accounts/:id/users')
  createUser(
    @Param('id') accountId: string,
    @Body() body: { email: string; password: string; role: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.createUser(
      accountId,
      body.email,
      body.password,
      body.role,
      adminUserId,
    );
  }

  /** Change user role */
  @Patch('users/:id/role')
  updateRole(
    @Param('id') userId: string,
    @Body() body: { role: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.updateUserRole(userId, body.role, adminUserId);
  }

  /** Toggle user active/inactive */
  @Patch('users/:id/toggle-active')
  toggleActive(
    @Param('id') userId: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.toggleUserActive(userId, adminUserId);
  }
}
