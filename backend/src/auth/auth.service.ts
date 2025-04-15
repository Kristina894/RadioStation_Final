import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDtos, VerifyEmailDTO, ChangePasswordDTO } from "./dto";
import * as argon from "argon2";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { GenerateOTP } from "utils/generateOTP";
import * as nodemailer from "nodemailer";

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService
    ) { }

    async login(dto: AuthDtos) {
        if (!dto.email || !dto.password) {
            throw new UnauthorizedException("Email and password are required");
        }

        const user = await this.prisma.user.findUnique({ where: { email: dto.email.replace(/['"]/g, '') } });
        if (!user) throw new UnauthorizedException("No user found");

        if (!user.isVerified) {
            throw new UnauthorizedException("Email is not verified. Please verify using OTP.");
        }

        const isPasswordValid = await argon.verify(user.password, dto.password);
        if (!isPasswordValid) throw new UnauthorizedException("Incorrect password");

        return this.signToken({ userId: user.id, email: user.email });
    }

    async signup(dto: AuthDtos) {
        if (!dto.email || !dto.password || !dto.firstName) {
            throw new HttpException("Email, password, and first name are required", 400);
        }

        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser) throw new HttpException("User already exists", 400);

        const hashedPassword = await argon.hash(dto.password);
        const otp = GenerateOTP();

        await this.SendMail(dto.email, otp);

        await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                firstName: dto.firstName,
                Otp: otp,
                isVerified: false,
                role: dto.role
            },
        });

        return { message: "OTP sent to email for verification" };

    }

    async verifyOTP(email: string, otp: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new HttpException("User not found", 404);

        if (user.isVerified) throw new HttpException("User already verified", 400);
        if (user.Otp !== otp) throw new HttpException("Incorrect OTP", 401);

        await this.prisma.user.update({
            where: { email },
            data: { isVerified: true, Otp: "" }
        });

        return this.signToken({ userId: user.id, email: user.email });
    }

    async verifyForgetPasswordOTP(email: string, otp: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new HttpException("User not found", 404);

        if (!user.isVerified) throw new HttpException("User is not verified", 400);
        if (user.Otp !== otp) throw new HttpException("Incorrect OTP", 401);

        await this.prisma.user.update({
            where: { email },
            data: { Otp: "" }
        });

        return this.signToken({ userId: user.id, email: user.email });
    }

    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new HttpException("User not found", 404);
        if (!user.isVerified) throw new HttpException("User is not verified", 401);

        const otp = GenerateOTP();
        await this.prisma.user.update({
            where: { email },
            data: { forgotPassword: true, Otp: otp }
        });

        await this.SendMail(email, otp);

        return { message: "Forgot password OTP sent successfully" };
    }

    async changeNewPassword(dto: ChangePasswordDTO) {
        const { email, password } = dto;
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new HttpException("User not found", 404);
        if (!user.isVerified || !user.forgotPassword) throw new HttpException("Invalid request", 400);

        const hashedPassword = await argon.hash(password);
        await this.prisma.user.update({
            where: { email },
            data: { password: hashedPassword, forgotPassword: false, Otp: "" }
        });

        return { message: "Password changed successfully" };
    }

    async signToken({ userId, email }: { userId: string; email: string }): Promise<{ access_token: string }> {
        const jwtSecret = this.config.get<string>("JWT_SECRET");
        if (!jwtSecret) throw new Error("JWT_SECRET is not set in environment variables");

        const payload = { sub: userId, email };
        const token = await this.jwt.signAsync(payload, {
            expiresIn: "7d",
            secret: jwtSecret,
        });

        return { access_token: token };
    }

    async SendMail(email: string, otp: string) {
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
            subject: "OTP Verification for Sample App",
            html: `<p>This is the OTP for your email verification: <strong>${otp}</strong></p>`,
        };

        try {
            await transporter.sendMail(mailOptions);
            return { success: true, message: `Mail Sent to ${email}` };
        } catch (error) {
            throw new HttpException(`Error sending email: ${error.message}`, 500);
        }
    }
}
