import { Module } from '@nestjs/common';
import { AdminApprovalService } from './adminapproval.service';
import { AdminapprovalController } from './adminapproval.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AdminapprovalController],
  providers: [AdminApprovalService, PrismaService],
})
export class AdminapprovalModule { }
