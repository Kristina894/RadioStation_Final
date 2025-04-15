import { Module } from '@nestjs/common';
import { AdvertisementSlotService } from './advertisementslot.service';
import { AdvertisementSlotController } from './advertisementslot.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AdvertisementSlotController],
  providers: [AdvertisementSlotService, PrismaService],
})
export class AdvertisementSlotModule { }
