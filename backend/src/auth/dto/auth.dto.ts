import { Role } from "@prisma/client";
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class AuthDtos {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{4,30}$/)
  password: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  role: Role

  @IsString()
  @IsOptional()
  lastName: string
}

export class VerifyOTPDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class VerifyEmailDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ChangePasswordDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{4,30}$/)
  password: string;

}