import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttemptsModule } from './attempts/attempts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { ImportModule } from './import/import.module';
import { ParserModule } from './parser/parser.module';
import { PrismaModule } from './prisma/prisma.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    FilesModule,
    TestsModule,
    ParserModule,
    ImportModule,
    AttemptsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
