import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

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
  bootstrapAdmin(@Body() body: { email: string; secret: string; force?: boolean }) {
    return this.authService.bootstrapAdmin(body.email, body.secret, body.force);
  }
}
