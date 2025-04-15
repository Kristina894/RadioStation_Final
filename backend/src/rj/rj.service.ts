import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateRjDto, UpdateRjDto } from './dto/create-rj.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RjService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateRjDto) {
    return this.prisma.rJ.create({ data });
  }

  async findAll() {
    return this.prisma.rJ.findMany({
      include: { station: true, slots: true, bookings: true },
    });
  }

  async findOne(id: string) {
    const rj = await this.prisma.rJ.findUnique({
      where: { id },
      include: { station: true, slots: true, bookings: true },
    });
    if (!rj) throw new NotFoundException('RJ not found');
    return rj;
  }

  async update(id: string, data: UpdateRjDto) {
    return this.prisma.rJ.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Option 1: Prevent deletion if there are any associated advertisement slots
    const slots = await this.prisma.advertisementSlot.findMany({
      where: { rjId: id },
    });
    if (slots.length > 0) {
      throw new BadRequestException(
        'Cannot delete RJ with existing advertisement slots. Remove them first.'
      );
    }
    
    // Option 2: Cascade delete advertisement slots before deleting the RJ.
    // Uncomment the lines below to cascade delete advertisement slots.
    /*
    await this.prisma.advertisementSlot.deleteMany({
      where: { rjId: id },
    });
    */

    return this.prisma.rJ.delete({
      where: { id },
    });
  }
}
