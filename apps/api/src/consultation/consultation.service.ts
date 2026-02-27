import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConsultationService {
  constructor(private readonly prisma: PrismaService) {}

  async createListing(consultantId: string, data: {
    title: string;
    description?: string;
    category: string;
    price_uzs: number;
    duration_min?: number;
  }) {
    const c = await this.prisma.consultation.create({
      data: {
        consultant_id: consultantId,
        title: data.title,
        description: data.description,
        category: data.category,
        price_uzs: BigInt(data.price_uzs),
        duration_min: data.duration_min ?? 60,
      },
    });
    return { ...c, price_uzs: c.price_uzs.toString() };
  }

  async listAvailable(category?: string) {
    const where: any = { status: 'AVAILABLE' };
    if (category) where.category = category;

    const items = await this.prisma.consultation.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        consultant: { select: { name: true } },
      },
    });

    return items.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      price_uzs: c.price_uzs.toString(),
      duration_min: c.duration_min,
      consultant_name: c.consultant.name,
      created_at: c.created_at,
    }));
  }

  async getMyListings(accountId: string) {
    const items = await this.prisma.consultation.findMany({
      where: { consultant_id: accountId },
      orderBy: { created_at: 'desc' },
      include: { client: { select: { name: true } } },
    });

    return items.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      price_uzs: c.price_uzs.toString(),
      duration_min: c.duration_min,
      status: c.status,
      client_name: c.client?.name ?? null,
      scheduled_at: c.scheduled_at,
      rating: c.rating ? Number(c.rating) : null,
      created_at: c.created_at,
    }));
  }

  async getMyBookings(accountId: string) {
    const items = await this.prisma.consultation.findMany({
      where: { client_id: accountId },
      orderBy: { created_at: 'desc' },
      include: { consultant: { select: { name: true } } },
    });

    return items.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      price_uzs: c.price_uzs.toString(),
      duration_min: c.duration_min,
      status: c.status,
      consultant_name: c.consultant.name,
      scheduled_at: c.scheduled_at,
      rating: c.rating ? Number(c.rating) : null,
      created_at: c.created_at,
    }));
  }

  async book(clientId: string, consultationId: string, scheduledAt: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) throw new NotFoundException('Konsultatsiya topilmadi');
    if (consultation.status !== 'AVAILABLE') throw new BadRequestException('Bu konsultatsiya band');
    if (consultation.consultant_id === clientId) throw new BadRequestException('O\'zingizga bron qilib bo\'lmaydi');

    const c = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        client_id: clientId,
        status: 'BOOKED',
        scheduled_at: new Date(scheduledAt),
      },
    });
    return { ...c, price_uzs: c.price_uzs.toString() };
  }

  async complete(consultantId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) throw new NotFoundException('Konsultatsiya topilmadi');
    if (consultation.consultant_id !== consultantId) throw new BadRequestException('Sizning konsultatsiyangiz emas');

    const c = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: 'COMPLETED', completed_at: new Date() },
    });
    return { ...c, price_uzs: c.price_uzs.toString() };
  }

  async rate(clientId: string, consultationId: string, rating: number, review?: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) throw new NotFoundException('Konsultatsiya topilmadi');
    if (consultation.client_id !== clientId) throw new BadRequestException('Sizning broningiz emas');
    if (consultation.status !== 'COMPLETED') throw new BadRequestException('Faqat yakunlangan konsultatsiyani baholash mumkin');

    const c = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { rating, review },
    });
    return { ...c, price_uzs: c.price_uzs.toString() };
  }

  async getCategories() {
    const result = await this.prisma.consultation.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'AVAILABLE' },
    });
    return result.map((r) => ({ category: r.category, count: r._count.id }));
  }
}
