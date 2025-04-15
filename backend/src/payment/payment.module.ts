import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { BookingService } from 'src/booking/booking.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, BookingService],
})
export class PaymentModule { }
