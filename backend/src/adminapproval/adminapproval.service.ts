import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminApprovalService {
    constructor(private prisma: PrismaService) { }

    async approve(bookingId: string, adminId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: { stationId: true },
        });
        if (!booking) {
            throw new HttpException("Booking id is not found", HttpStatus.NOT_FOUND)
        }

        return this.prisma.adminApprovalRequest.create({
            data: {
                bookingId,
                adminId,
                stationId: booking.stationId,
                approvalStatus: ApprovalStatus.APPROVED,
            },
        });
    }
}
