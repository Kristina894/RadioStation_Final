import { Body, Controller, HttpCode, HttpStatus, Post, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDtos, VerifyEmailDTO, VerifyOTPDTO, ChangePasswordDTO } from "./dto";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post("signup")
    async signup(@Body() dto: AuthDtos) {
        return this.authService.signup(dto);
    }

    @Post("signin")
    @HttpCode(HttpStatus.OK)
    async signin(@Body() dto: AuthDtos) {
        return this.authService.login(dto);
    }

    @Put("verifyotp")
    @HttpCode(HttpStatus.OK)
    async verifyOtp(@Body() dto: VerifyOTPDTO) {
        return this.authService.verifyOTP(dto.email, dto.otp);
    }

    @Put("verifyforgotPassotp")
    @HttpCode(HttpStatus.OK)
    async verifyForgotPasswordOtp(@Body() dto: VerifyOTPDTO) {
        return this.authService.verifyForgetPasswordOTP(dto.email, dto.otp);
    }

    @Put("forgotPassword")
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() dto: VerifyEmailDTO) {
        return this.authService.forgotPassword(dto.email);
    }

    @Put("changePassword")
    @HttpCode(HttpStatus.OK)
    async changePassword(@Body() dto: ChangePasswordDTO) {
        return this.authService.changeNewPassword(dto);
    }
}