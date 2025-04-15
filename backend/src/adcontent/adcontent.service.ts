import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadAdDto } from './dto/upload-ad.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class AdContentService {
  constructor(private prisma: PrismaService) {}

  async upload(data: UploadAdDto) {
    if (!data.bookingId) {
      throw new BadRequestException('bookingId is required');
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    
    const completedPayment = await this.prisma.payment.findFirst({
      where: {
        bookingId: data.bookingId,
        paymentStatus: PaymentStatus.COMPLETED,
      },
    });
    
    if (!completedPayment) {
      throw new BadRequestException('Payment is not completed for this booking');
    }

    if (!data.userId) {
      throw new BadRequestException('userId is required');
    }
    
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.adContent.create({
      data: {
        booking: { connect: { id: data.bookingId } },
        user: { connect: { id: data.userId } },
        filePath: data.filePath,
        adDescription: data.adDescription,
      },
    });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.adContent.findMany({ where: { bookingId } });
  }
}
