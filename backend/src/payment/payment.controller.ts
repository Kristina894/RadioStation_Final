import { Controller, Post, Body, Param, Get, UseGuards, ValidationPipe, ParseFloatPipe, ParseIntPipe, HttpException, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { UserDecorator } from 'src/decorator'; // Adjust import paths if needed
import { User } from '@prisma/client';
import { JwtGuard } from 'src/guards'; // Adjust import paths if needed
// Optional: Define DTOs for validation

@Controller('payments') // Keep endpoint as /payments
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /**
   * Endpoint to create a payment record and Razorpay order.
   * Expects amount in Rupees.
   */
  @Post()
  @UseGuards(JwtGuard)
  async createPayment(
    // If using DTOs: @Body(new ValidationPipe({ transform: true })) body: CreatePaymentDto,
    @Body() body: { bookingId: string; amount: number; transactionId: string }, // Expect amount as number (Float/Int)
    @UserDecorator() usr: User,
  ) {
     // Manual validation if not using DTOs with class-validator
     if (typeof body.amount !== 'number' || body.amount <= 0) {
         throw new HttpException('Invalid amount: must be a positive number.', HttpStatus.BAD_REQUEST);
     }
     if (!body.bookingId || typeof body.bookingId !== 'string') {
          throw new HttpException('Invalid bookingId.', HttpStatus.BAD_REQUEST);
     }
      if (!body.transactionId || typeof body.transactionId !== 'string') {
          throw new HttpException('Invalid transactionId.', HttpStatus.BAD_REQUEST);
     }

    // The service expects amount in Rupees (Float)
    return this.paymentService.createPayment(
      body.bookingId,
      usr.id,
      body.amount, // Pass the amount directly (service handles conversion)
      body.transactionId,
    );
  }

  /**
   * Endpoint to complete the payment after Razorpay callback.
   * Verifies signature and updates DB records via the service.
   * :id is the DATABASE payment ID.
   */
  @Post('complete/:id') // :id is the database payment ID
  // Consider if JWT Guard is needed based on whether frontend calls this AFTER Razorpay success
  // @UseGuards(JwtGuard)
  async completePayment(
    @Param('id') paymentId: string, // The DB payment ID
    // If using DTOs: @Body(new ValidationPipe()) body: CompletePaymentDto,
    @Body() body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
     // Basic validation if not using DTOs
      if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
          throw new HttpException('Missing Razorpay payment details in request body.', HttpStatus.BAD_REQUEST);
      }
    return this.paymentService.completePayment(paymentId, body);
  }

  /**
   * Endpoint to list payments for the authenticated user.
   */
  @Get('user')
  @UseGuards(JwtGuard)
  async listPaymentsByUser(@UserDecorator() usr: User) {
    return this.paymentService.listPaymentsByUser(usr.id);
  }
}
