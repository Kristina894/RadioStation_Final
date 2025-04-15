import { Module } from '@nestjs/common';
import { AdContentService } from './adcontent.service';
import { AdContentController } from './adcontent.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AdContentController],
  providers: [AdContentService, PrismaService],
})

export class AdcontentModule { }
