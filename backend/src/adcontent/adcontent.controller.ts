// ad-content.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AdContentService } from './adcontent.service';
import { UploadAdDto } from './dto/upload-ad.dto';

@Controller('adcontent')
export class AdContentController {
  constructor(private adContentService: AdContentService) { }

  @Post()
  async upload(@Body() uploadAdDto: UploadAdDto) {
    return this.adContentService.upload(uploadAdDto);
  }

  @Get('/booking/:bookingId')
  async findByBooking(@Param('bookingId') bookingId: string) {
    return this.adContentService.findByBooking(bookingId);
  }
}
