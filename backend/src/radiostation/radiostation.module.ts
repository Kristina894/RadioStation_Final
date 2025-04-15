import { Module } from '@nestjs/common';
import { RadioStationService } from './radiostation.service';
import { RadioStationController } from './radiostation.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [RadioStationController],
  providers: [RadioStationService, PrismaService],
})
export class RadiostationModule { }
