import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.test.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
          },
        },
        _count: {
          select: { questions: true, attempts: true },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const test = await this.prisma.test.findFirst({
      where: { id, userId },
      include: this.detailInclude(),
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return test;
  }

  detailInclude() {
    return {
      sourceFile: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
        },
      },
      questions: {
        orderBy: { order: 'asc' as const },
        include: {
          variants: {
            orderBy: { order: 'asc' as const },
          },
        },
      },
    };
  }
}
