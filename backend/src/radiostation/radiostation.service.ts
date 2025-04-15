import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRadioStationDto, UpdateRadioStationDetailsDto, UpdateRadioStationDto } from './dto/create-radio-station.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApprovalStatus, SlotStatus, Role } from '@prisma/client';

@Injectable()
export class RadioStationService {
  constructor(private prisma: PrismaService) { }

  async create(data: CreateRadioStationDto) {
    // In a normal creation flow without approval, you might simply create the station.
    // But here we use createWithApproval to attach the creator’s details.
    return this.prisma.radioStation.create({ data });
  }

  /**
   * Returns stations based on the current user’s role.
   * - Admin: all stations
   * - Station role: only stations that they created (via approval record)
   * - Regular user: only approved stations
   */
  async findStations(user: { id: string; role: Role }) {
    if (user.role === Role.ADMIN) {
      return this.prisma.radioStation.findMany({
        include: {
          rjs: true,
          advertisementSlots: true,
          bookings: true,
          adminApprovalRequests: true,
        },
      });
    } else {
      // For a regular user, show only approved stations.
      return this.prisma.radioStation.findMany({
        where: {
          adminApprovalRequests: {
            some: {
              approvalStatus: ApprovalStatus.APPROVED,
            },
          },
        },
        include: {
          rjs: true,
          advertisementSlots: true,
          bookings: true,
          adminApprovalRequests: true,
        },
      });
    }
  }

  async findOne(id: string) {
    const station = await this.prisma.radioStation.findUnique({
      where: { id },
      include: {
        rjs: true,
        advertisementSlots: true,
        bookings: true,
        adminApprovalRequests: true,
      },
    });
    if (!station) throw new NotFoundException('Radio Station not found');
    return station;
  }

  async update(
    id: string,
    data: UpdateRadioStationDetailsDto,
    user: { id: string; role: Role }
  ) {
    const station = await this.prisma.radioStation.findUnique({
      where: { id },
      include: { adminApprovalRequests: true },
    });
    if (!station) throw new NotFoundException('Radio Station not found');
  
    // Identify the creator from the admin approval requests
    // We assume the creator is the one with bookingId === null.
    const creatorApproval = station.adminApprovalRequests.find(
      (approval) => approval.bookingId === null
    );
    // if (!creatorApproval || creatorApproval.adminId !== user.id) {
    //   throw new ForbiddenException('You are not authorized to update this station');
    // }
  
    // Remove the approvalStatus field from the update data
    const { ...updateData } = data;
  
    return this.prisma.radioStation.update({
      where: { id },
      data: updateData,
    });
  }
    

  async remove(id: string) {
    return this.prisma.radioStation.delete({
      where: { id },
    });
  }

  /**
   * Only an admin can approve or reject a station.
   * (Assume the controller has already checked that the current user is an admin.)
   */
  async approveOrRejectApproval(approvalId: string, data: UpdateRadioStationDto) {
    const approvalRequest = await this.prisma.adminApprovalRequest.findUnique({
      where: { id: approvalId },
    });
    if (!approvalRequest) {
      throw new NotFoundException('Approval request not found');
    }

    const updatedApproval = await this.prisma.adminApprovalRequest.update({
      where: { id: approvalId },
      data: {
        approvalStatus: data.approvalStatus,
      },
    });
    console.log(data.approvalStatus);
    
    return updatedApproval;
  }

  async createWithApproval(data: CreateRadioStationDto, creator: { id: string; role: Role }) {
    if (creator.role === 'USER') {
      throw new ForbiddenException('Only admin or station users can create a station.');
    }

    const station = await this.prisma.radioStation.create({
      data,
    });

    const approval = await this.prisma.adminApprovalRequest.create({
      data: {
        stationId: station.id,
        adminId: creator.id,
        approvalStatus: ApprovalStatus.PENDING,
        bookingId: null,
      },
    });

    return { station, approval };
  }

  async findPendingStations(user: { id: string; role: Role }) {
    if (user.role === Role.USER) {
      throw new ForbiddenException('Not authorized to view pending stations.');
    }

    if (user.role === Role.ADMIN) {
      return this.prisma.radioStation.findMany({
        where: {
          AND: [
            { adminApprovalRequests: { some: { approvalStatus: ApprovalStatus.PENDING } } },
            { adminApprovalRequests: { some: { adminId: user.id } } },
            { adminApprovalRequests: { none: { approvalStatus: ApprovalStatus.APPROVED } } },
          ],
        },
        include: {
          adminApprovalRequests: true,
          rjs: true,
          advertisementSlots: true,
          bookings: true,
        },
      });
    } else {
      return this.prisma.radioStation.findMany({
        where: {
          AND: [
            { adminApprovalRequests: { some: { approvalStatus: ApprovalStatus.PENDING } } },
            { adminApprovalRequests: { none: { approvalStatus: ApprovalStatus.APPROVED } } },
          ],
        },
        include: {
          adminApprovalRequests: true,
          rjs: true,
          advertisementSlots: true,
          bookings: true,
        },
      });
    }
  }

  async findRejectedStations(user: { id: string; role: Role }) {
    if (user.role === Role.USER) {
      throw new ForbiddenException('Not authorized to view rejected stations.');
    }

    if (user.role === Role.ADMIN) {
      return this.prisma.radioStation.findMany({
        where: {
          AND: [
            { adminApprovalRequests: { some: { approvalStatus: ApprovalStatus.REJECTED } } },
            { adminApprovalRequests: { some: { adminId: user.id } } },
            { adminApprovalRequests: { none: { approvalStatus: ApprovalStatus.APPROVED } } },
          ],
        },
        include: {
          adminApprovalRequests: true,
          rjs: true,
          advertisementSlots: true,
          bookings: true,
        },
      });
    } else {
      return this.prisma.radioStation.findMany({
        where: {
          AND: [
            { adminApprovalRequests: { some: { approvalStatus: ApprovalStatus.REJECTED } } },
            { adminApprovalRequests: { none: { approvalStatus: ApprovalStatus.APPROVED } } },
          ],
        },
        include: {
          adminApprovalRequests: true,
          rjs: true,
          advertisementSlots: true,
          bookings: true,
        },
      });
    }
  }
}
