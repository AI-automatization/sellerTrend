import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** One-time bootstrap: promote first user to SUPER_ADMIN (no-op if SUPER_ADMIN already exists) */
  @Post('bootstrap-admin')
  @HttpCode(200)
  bootstrapAdmin(@Body() body: { email: string }) {
    return this.authService.bootstrapAdmin(body.email);
  }
}
