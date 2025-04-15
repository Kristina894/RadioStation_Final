import { IsNotEmpty, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateRjDto {
  @IsNotEmpty()
  @IsString()
  stationId: string;

  @IsNotEmpty()
  @IsString()
  rjName: string;

  @IsNotEmpty()
  @IsString()
  showName: string;

  @IsNotEmpty()
  @IsString()
  showTiming: string;
}

export class UpdateRjDto extends PartialType(CreateRjDto) {}
