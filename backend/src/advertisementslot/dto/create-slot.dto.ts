import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateSlotDto {
  @IsNotEmpty()
  @IsString()
  stationId: string;

  @IsNotEmpty()
  @IsString()
  rjId: string;

  @IsNotEmpty()
  slotTime: Date;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class UpdateSlotDto extends PartialType(CreateSlotDto) {}
