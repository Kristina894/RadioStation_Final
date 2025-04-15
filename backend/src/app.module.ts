import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RadiostationModule } from './radiostation/radiostation.module';
import { RjModule } from './rj/rj.module';
import { AdvertisementSlotModule } from './advertisementslot/advertisementslot.module';
import { BookingModule } from './booking/booking.module';
import { AdcontentModule } from './adcontent/adcontent.module';
import { AdminapprovalModule } from './adminapproval/adminapproval.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  // config module for envs
  imports: [ConfigModule.forRoot({
    isGlobal: true
  }), AuthModule, UserModule, PrismaModule, RadiostationModule, RjModule, AdvertisementSlotModule, BookingModule, AdcontentModule, AdminapprovalModule, PaymentModule]
})
export class AppModule { }
