import { Module } from '@nestjs/common';
import { RjService } from './rj.service';
import { RjController } from './rj.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [RjController],
  providers: [RjService, PrismaService],
})
export class RjModule { }
