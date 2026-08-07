import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // POST /api/auth/register
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // POST /api/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // POST /api/auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  // POST /api/auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    // Decode without verifying to get userId
    const decoded: any = JSON.parse(
      Buffer.from(refreshTokenDto.refreshToken.split('.')[1], 'base64').toString(),
    );
    return this.authService.refreshTokens(decoded.sub, refreshTokenDto.refreshToken);
  }

  // POST /api/auth/forgot-password/request-otp
  @Post('forgot-password/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: { email: string }) {
    return this.authService.requestOtp(body.email);
  }

  // POST /api/auth/forgot-password (Step 2 Verification)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: any) {
    // If otp is provided, handle Step 2 reset
    if (body.otp) {
      return this.authService.resetPasswordWithOtp(body.email, body.otp, body.newPassword);
    }
    // Fallback/Legacy: just request otp
    return this.authService.requestOtp(body.email);
  }

  // POST /api/auth/phone/register
  @Post('phone/register')
  @HttpCode(HttpStatus.OK)
  async phoneRegister(@Body() body: { name: string; phone: string; password: string; email?: string }) {
    return this.authService.phoneRegister(body);
  }

  // POST /api/auth/phone/login
  @Post('phone/login')
  @HttpCode(HttpStatus.OK)
  async phoneLogin(@Body() body: { phone: string; password: string }) {
    return this.authService.phoneLogin(body);
  }

  // POST /api/auth/phone/send-otp
  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendPhoneOtp(@Body() body: { phone: string }) {
    return this.authService.sendPhoneOtp(body.phone);
  }

  // POST /api/auth/phone/verify-otp
  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneOtp(@Body() body: { phone: string; otp: string }) {
    return this.authService.verifyPhoneOtp(body.phone, body.otp);
  }

  // POST /api/auth/phone/complete-registration
  @Post('phone/complete-registration')
  @HttpCode(HttpStatus.OK)
  async completePhoneRegistration(@Body() body: { phone: string; name: string; email: string }) {
    return this.authService.completePhoneRegistration(body.phone, body.name, body.email);
  }

  // GET /api/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }
}


// GET /api/auth/me
@Get('me')
@UseGuards(JwtAuthGuard)
async getMe(@Request() req) {
  return this.authService.getMe(req.user.userId);
}
}

