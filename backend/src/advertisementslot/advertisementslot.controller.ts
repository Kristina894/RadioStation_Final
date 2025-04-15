import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { AdvertisementSlotService } from './advertisementslot.service';
import { CreateSlotDto, UpdateSlotDto } from './dto/create-slot.dto';

@Controller('slots')
export class AdvertisementSlotController {
  constructor(private readonly slotService: AdvertisementSlotService) { }

  @Post()
  async create(@Body() createDto: CreateSlotDto) {
    return this.slotService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.slotService.findAll();
  }

  @Get("withfilter")
  async findAllAvailableSlotsWithFilter(@Query("avalablityStatus") avalablityStatus: string) {
    return this.slotService.findAllAvailableSlotsWithFilter(avalablityStatus)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.slotService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateSlotDto) {
    return this.slotService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.slotService.remove(id);
  }
}
