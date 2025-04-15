import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RjService } from './rj.service';
import { CreateRjDto, UpdateRjDto } from './dto/create-rj.dto';

@Controller('rjs')
export class RjController {
  constructor(private readonly rjService: RjService) { }

  @Post()
  async create(@Body() createDto: CreateRjDto) {
    return this.rjService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.rjService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.rjService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateRjDto) {
    return this.rjService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.rjService.remove(id);
  }
}
