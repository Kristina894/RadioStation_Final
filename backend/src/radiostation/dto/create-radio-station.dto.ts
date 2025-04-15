import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApprovalStatus } from '@prisma/client';

export class CreateRadioStationDto {
  @IsNotEmpty()
  @IsString()
  stationName: string;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsString()
  @IsOptional()
  description: string

  @IsNotEmpty()
  @IsEmail()
  contactEmail: string;

  @IsNotEmpty()
  @IsString()
  contactPhone: string;
}


export class UpdateRadioStationDto extends PartialType(CreateRadioStationDto) {
  @IsEnum(ApprovalStatus)
  approvalStatus: ApprovalStatus
}

export class UpdateRadioStationDetailsDto extends PartialType(CreateRadioStationDto){}
