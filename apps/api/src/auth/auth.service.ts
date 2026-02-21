import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

  private signToken(userId: string, accountId: string, role: string): string {
    return this.jwt.sign({ sub: userId, account_id: accountId, role });
  }
}
