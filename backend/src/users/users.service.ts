import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SafeUser = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserWithPassword = SafeUser & {
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(email: string, passwordHash: string): Promise<SafeUser> {
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    return this.toSafeUser(user);
  }

  toSafeUser(user: UserWithPassword): SafeUser {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
