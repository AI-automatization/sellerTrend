import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralService } from '../referral/referral.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly referralService: ReferralService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const account = await this.prisma.account.create({
      data: { name: dto.company_name },
    });

    const password_hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        account_id: account.id,
        email: dto.email,
        password_hash,
        role: 'USER',
      },
    });

    // Apply referral code if provided
    if (dto.referral_code) {
      try {
        await this.referralService.applyReferralCode(
          dto.referral_code,
          account.id,
        );
        this.logger.log(
          `Referral code ${dto.referral_code} applied for account ${account.id}`,
        );
      } catch (e: any) {
        this.logger.warn(
          `Referral code ${dto.referral_code} failed: ${e.message}`,
        );
        // Don't block registration if referral code is invalid
      }
    }

    const token = this.signToken(user.id, account.id, user.role);
    return { access_token: token, account_id: account.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { account: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signToken(user.id, user.account_id, user.role);
    return {
      access_token: token,
      account_id: user.account_id,
      status: user.account.status,
    };
  }

  async bootstrapAdmin(email: string): Promise<{ ok: boolean; message: string }> {
    const existing = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    if (existing) {
      return { ok: false, message: 'SUPER_ADMIN already exists' };
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: false, message: 'User not found' };
    }
    await this.prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
    });
    return { ok: true, message: `${email} promoted to SUPER_ADMIN` };
  }

  private signToken(userId: string, accountId: string, role: string): string {
    return this.jwt.sign({ sub: userId, account_id: accountId, role });
  }
}
