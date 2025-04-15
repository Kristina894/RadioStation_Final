import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateRadioStationDto, UpdateRadioStationDetailsDto, UpdateRadioStationDto } from './dto/create-radio-station.dto';
import { RadioStationService } from './radiostation.service';
import { JwtGuard } from 'src/guards';
import { UserDecorator } from 'src/decorator';
import { ForbiddenException } from '@nestjs/common';

@UseGuards(JwtGuard)
@Controller('stations')
export class RadioStationController {
  constructor(private readonly radioStationService: RadioStationService) { }

  @Post()
  async create(
    @UserDecorator() usr,
    @Body() createDto: CreateRadioStationDto
  ) {
    // Only non-regular users (ADMIN or STATION) can create a station.
    if (usr.role === 'USER') {
      throw new ForbiddenException('Not authorized to create a station');
    }
    return this.radioStationService.createWithApproval(createDto, usr);
  }

  @Get()
  async findAll(@UserDecorator() usr) {
    return this.radioStationService.findStations(usr);
  }

  @Get('approvalPendingStations')
  async findApprovalPendingStations(@UserDecorator() usr) {
    return this.radioStationService.findPendingStations(usr);
  }

  @Get('rejectedStations')
  async findRejectedStations(@UserDecorator() usr) {
    return this.radioStationService.findRejectedStations(usr);
  }

  @Patch('/approve/:id')
  async updateApproval(
    @UserDecorator() usr,
    @Param('id') approvalId: string,
    @Body() updateApprovalDto: UpdateRadioStationDto,
  ) {
    if (usr.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can approve or reject stations');
    }
    
    return this.radioStationService.approveOrRejectApproval(approvalId, updateApprovalDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.radioStationService.findOne(id);
  }

  @Patch(':id')
  async update(
    @UserDecorator() usr,
    @Param('id') id: string,
    @Body() updateDto: UpdateRadioStationDetailsDto
  ) {
    return this.radioStationService.update(id, updateDto, usr);
  }


  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.radioStationService.remove(id);
  }
}
