import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  stationId: string;

  @IsNotEmpty()
  @IsString()
  rjId: string;

  @IsNotEmpty()
  @IsString()
  slotId: string;

  @IsString()
  @IsOptional()
  paymentId: string;
}


export class UpdateBookingDto extends PartialType(CreateBookingDto) { }
