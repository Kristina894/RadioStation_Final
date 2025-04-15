// booking.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, SlotStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateBookingDto) {
    // Check if the slot exists and is available
    const slot = await this.prisma.advertisementSlot.findUnique({
      where: { id: data.slotId },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.availabilityStatus !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('Slot is already booked');
    }

    // Create the booking with a PENDING status
    const booking = await this.prisma.booking.create({
      data: {
        ...data,
        bookingStatus: BookingStatus.PENDING,
      },
    });

    // Mark the slot as booked
    await this.prisma.advertisementSlot.update({
      where: { id: data.slotId },
      data: { availabilityStatus: SlotStatus.BOOKED },
    });

    return booking;
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: {  station: true, rj: true, slot: true },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { user: true, station: true, rj: true, slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
}
