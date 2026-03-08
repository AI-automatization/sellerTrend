import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.platform.findMany({
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    });
  }
}
