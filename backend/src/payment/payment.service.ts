import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path if needed
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import * as nodemailer from "nodemailer";
import { PaymentStatus, BookingStatus, SlotStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private razorpay: Razorpay;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    // Ensure environment variables are loaded
    const keyId = process.env.RAZORPAY_KEYID;
    const keySecret = process.env.RAZORPAY_KEYSECRET;

    if (!keyId || !keySecret) {
      console.error('FATAL ERROR: Razorpay Key ID or Key Secret not found in environment variables.');
      throw new Error('Razorpay configuration missing.');
    }
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Create a payment record (DB) and Razorpay order.
   * Accepts amount in Rupees (Float), converts to Paise (Int) for storage and Razorpay.
   */
  async createPayment(
    bookingId: string,
    userId: string,
    amountInRupees: number,
    transactionId: string,
  ): Promise<{ paymentId: string; orderId: string; amount: number; currency: string }> {

    if (typeof amountInRupees !== 'number' || amountInRupees <= 0) {
      throw new HttpException('Invalid payment amount provided.', HttpStatus.BAD_REQUEST);
    }
    const amountPaise = Math.round(amountInRupees * 100);
    if (amountPaise <= 0) { // Double check after rounding
      throw new HttpException('Amount must be positive.', HttpStatus.BAD_REQUEST);
    }

    // Ensure booking exists and is pending
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { bookingStatus: true, station: true } // Only select necessary field
    });


    if (!booking) {
      throw new HttpException('Booking not found.', HttpStatus.NOT_FOUND);
    }
    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new HttpException(`Booking status (${booking.bookingStatus}) does not allow payment.`, HttpStatus.BAD_REQUEST);
    }

    const shortRandom = crypto.randomBytes(4).toString('hex');
    const receiptId = `rcpt_${bookingId}_${shortRandom}`.slice(0, 40);

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        bookingId: bookingId,
        userId: userId,
        transactionId: transactionId,
        clientDateTime: new Date().toISOString(),
      },
    };

    try {
      const order = await this.razorpay.orders.create(options);

      const payment = await this.prisma.payment.create({
        data: {
          booking: { connect: { id: bookingId } },
          user: { connect: { id: userId } },
          amountInPaise: amountPaise,
          currency: order.currency,
          paymentStatus: PaymentStatus.PENDING,
          razorpayOrderId: order.id,
          transactionId: transactionId,
        },
      });

      await this.SendMail(
        booking.station.stationName,
        booking.station.contactEmail,
        payment.amountInPaise / 100,
        payment.id
      )

      return {
        paymentId: payment.id,
        orderId: order.id,
        amount: order.amount as number,
        currency: order.currency,
      };
    } catch (error: any) {
      console.error(`Error creating payment/order for booking ${bookingId}:`, error.statusCode ? error.error || error : error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpException(`Database constraint violation: ${error.meta?.target}`, HttpStatus.CONFLICT);
        }
        throw new HttpException(`Database error: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      } else if (error.statusCode && error.error && error.error.code === 'BAD_REQUEST_ERROR') {
        console.error(`Razorpay Input Validation Error: ${error.error.description} (Field: ${error.error.field})`);
        throw new HttpException(
          `Payment gateway validation error: ${error.error.description || 'Invalid input.'}`,
          HttpStatus.BAD_REQUEST // Return 400 Bad Request
        );
      } else if (error.statusCode && error.error) {
        throw new HttpException(
          `Razorpay Error: ${error.error.description || 'Unknown Razorpay Error'} (Code: ${error.error.code || 'N/A'})`,
          error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // Fallback generic error
      throw new HttpException(
        error.message || 'Failed to create payment order due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async SendMail(stationName: string, email: string, amount: number, paymentID: string) {
    const SENDER_EMAIL = this.config.get("SENDER_EMAIL")
    const SENDER_PASSWORD = this.config.get("SENDER_PASSWORD")
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SENDER_EMAIL,
        pass: SENDER_PASSWORD
      }
    });

    const mailOptions = {
      from: SENDER_EMAIL,
      to: email,
      subject: "A payment has been done to book an advertisement slot in your booking app.",
      html: `<p>${stationName} received ${amount} from the payment id:${paymentID} </p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true, message: `Mail Sent to ${email}` };
    } catch (error) {
      throw new HttpException(`Error sending email: ${error.message}`, 500);
    }
  }


  async completePayment(
    paymentId: string, // This is your DATABASE Payment ID
    body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ): Promise<{ message: string; bookingId: string; slotId: string }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!paymentId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new HttpException('Missing required payment details for verification.', HttpStatus.BAD_REQUEST);
    }

    // 1. Fetch the Payment record using DB paymentId, including related booking and slotId
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: { // Include booking
          select: { id: true, slotId: true }, // Select only needed fields from booking
        },
      },
    });

    if (!payment) {
      console.error(`Payment completion failed: Payment record not found for ID ${paymentId}`);
      throw new HttpException('Payment record not found.', HttpStatus.NOT_FOUND);
    }
    if (!payment.booking || !payment.booking.slotId) {
      console.error(`Payment completion failed: Booking or Slot link missing for Payment ID ${paymentId}`);
      throw new HttpException('Associated booking or slot not found for this payment.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Check if payment is already completed/failed
    if (payment.paymentStatus === PaymentStatus.COMPLETED) {
      console.warn(`Attempt to complete an already completed payment: ${paymentId}`);
      return { message: 'Payment already verified and completed.', bookingId: payment.bookingId, slotId: payment.booking.slotId };
    }
    if (payment.paymentStatus !== PaymentStatus.PENDING) {
      console.error(`Attempt to complete payment ${paymentId} with invalid status: ${payment.paymentStatus}`);
      throw new HttpException(`Payment cannot be completed in its current state: ${payment.paymentStatus}`, HttpStatus.BAD_REQUEST);
    }
    // Verify the Razorpay Order ID matches the one stored
    if (payment.razorpayOrderId !== razorpayOrderId) {
      console.error(`Razorpay Order ID mismatch for payment ${paymentId}. Expected ${payment.razorpayOrderId}, received ${razorpayOrderId}`);
      throw new HttpException('Order ID mismatch.', HttpStatus.BAD_REQUEST);
    }


    // 2. Verify the Razorpay signature
    const secret = process.env.RAZORPAY_KEYSECRET!; // Add '!' assuming it's validated at startup
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${payment.razorpayOrderId}|${razorpayPaymentId}`) // Use stored Order ID + received Payment ID
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      console.error(`Invalid payment signature for payment ${paymentId}. Expected ${generatedSignature}, received ${razorpaySignature}`);
      // Mark payment as FAILED upon invalid signature
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { paymentStatus: PaymentStatus.FAILED }
      });
      throw new HttpException('Invalid payment signature.', HttpStatus.BAD_REQUEST);
    }

    // 3. Signature is VALID - Update DB in a Transaction
    console.log(`Payment signature verified for payment ${paymentId}. Proceeding with DB updates.`);
    try {
      // Use transaction to ensure atomicity
      const [updatedPayment, updatedSlot] = await this.prisma.$transaction([
        // Update Payment: status, store Razorpay IDs/signature
        this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: razorpaySignature,
          },
        }),
        // Update Slot: Mark as BOOKED
        this.prisma.advertisementSlot.update({
          where: { id: payment.booking.slotId }, // Get slotId from the included booking data
          data: {
            availabilityStatus: SlotStatus.BOOKED,
          },
        }),
        // NOTE: We DO NOT update the BookingStatus here. It remains PENDING for admin approval.
      ]);

      console.log(`Payment ${updatedPayment.id} completed. Slot ${updatedSlot.id} marked as BOOKED. Booking ${payment.bookingId} remains PENDING admin approval.`);

      return {
        message: 'Payment verified successfully. Slot booked. Awaiting admin approval for booking.',
        bookingId: payment.bookingId,
        slotId: updatedSlot.id,
      };

    } catch (error: any) {
      console.error(`CRITICAL: DB update failed after successful payment verification for payment ${paymentId}:`, error);
      // This state is problematic - payment succeeded but booking isn't fully reflected.
      // Consider implementing alerting or a retry mechanism for such cases.
      throw new HttpException(
        'Payment verified, but failed to update booking/slot status in database. Please contact support immediately.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List payments for a given user.
   */
  async listPaymentsByUser(userId: string): Promise<any[]> { // Define a proper return type/DTO later
    const payments = await this.prisma.payment.findMany({
      where: { userId: userId },
      orderBy: { paymentDate: 'desc' },
      include: {
        booking: {
          select: { id: true, slotId: true },
        },
      },
    });

    // Map to a user-friendly format (e.g., convert amount back to rupees)
    return payments.map(p => ({
      paymentId: p.id,
      bookingId: p.bookingId,
      amount: p.amountInPaise / 100, // Convert back to Rupees
      currency: p.currency,
      status: p.paymentStatus,
      transactionId: p.transactionId,
      paymentDate: p.paymentDate,
      razorpayOrderId: p.razorpayOrderId,
      // Maybe add slot details if needed by joining further
    }));
  }
}