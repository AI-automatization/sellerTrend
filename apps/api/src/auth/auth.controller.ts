import { Controller, Post, Get, Patch, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refresh_token);
  }

  /** One-time bootstrap: promote first user to SUPER_ADMIN (no-op if SUPER_ADMIN already exists) */
  @Post('bootstrap-admin')
  @HttpCode(200)
  bootstrapAdmin(@Body() body: BootstrapAdminDto) {
    return this.authService.bootstrapAdmin(body.email, body.secret, body.force);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  /** Return current authenticated user info with account details */
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtPayload & { id: string; account_id: string }) {
    return this.authService.getMe(user);
  }

  /** Update onboarding progress for the current user's account */
  @Patch('onboarding')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  updateOnboarding(
    @CurrentUser('account_id') accountId: string,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.authService.updateOnboarding(accountId, dto);
  }
}
