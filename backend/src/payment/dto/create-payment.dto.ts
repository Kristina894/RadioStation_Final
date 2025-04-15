import { IsString } from "class-validator"

import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreatePaymentDTO {
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  transactionId: string;
}

export class CompletePaymentDTo {
    @IsString()
    paymentId: string
}