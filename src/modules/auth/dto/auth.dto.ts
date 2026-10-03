import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

export class SendPhoneOtpDto {
  @IsNotEmpty()
  @IsString()
  phone: string;
}

export class VerifyPhoneOtpDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class CompletePhoneRegDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}