import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) { }

  // ─── Register ───────────────────────────────────────────────────────────────
  async register(registerDto: RegisterDto) {
    try {
      const email = registerDto.email?.trim()?.toLowerCase();
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('This email is already registered. Please login.');
      }

      if (registerDto.phone) {
        const cleanedPhone = registerDto.phone.trim().replace(/\D/g, '');
        if (cleanedPhone) {
          const existingPhone = await this.usersService.findByPhone(cleanedPhone);
          if (existingPhone && existingPhone.password) {
            throw new ConflictException('This mobile number is already registered. Please login.');
          }
        }
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 12);
      const user = await this.usersService.create({
        ...registerDto,
        email,
        password: hashedPassword,
        role: UserRole.USER,
        isActive: true,
      } as any);

      // Non-blocking welcome email (do not await, so SMTP never blocks or crashes registration)
      this.mailService.sendWelcomeEmail(user.email, user.name).catch((err) => {
        console.warn('Welcome email failed (non-blocking):', err?.message || err);
      });

      const tokens = await this.generateTokens(user._id.toString(), user.email, user.role || 'user');
      await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

      return {
        success: true,
        message: 'Registration successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
        },
        token: tokens.accessToken,
        ...tokens,
      };
    } catch (error: any) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      if (error?.code === 11000) {
        const field = Object.keys(error?.keyPattern || {})[0] || 'Email or Phone';
        throw new ConflictException(`This ${field} is already registered. Please login.`);
      }
      console.error('Registration Error:', error);
      throw new BadRequestException(error?.message || 'Registration failed. Please check your details and try again.');
    }
  }

  // ─── Login (Supports Email OR 10-digit Phone) ──────────────────────────────

  async login(loginDto: LoginDto) {
    try {
      const emailOrPhone = loginDto.email?.trim();
      if (!emailOrPhone) {
        throw new BadRequestException('Email or mobile number is required');
      }

      // Check if user entered phone number instead of email
      const isPhone = /^[0-9]{10}$/.test(emailOrPhone.replace(/\D/g, ''));
      let user: any = null;
      if (isPhone) {
        user = await this.usersService.findByPhone(emailOrPhone.replace(/\D/g, ''));
      }
      if (!user) {
        user = await this.usersService.findByEmail(emailOrPhone.toLowerCase());
      }

      if (!user) {
        throw new UnauthorizedException('Invalid email/mobile number or password');
      }

      if (!user.password) {
        throw new UnauthorizedException('No password set for this account. Please create an account or reset password.');
      }

      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email/mobile number or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      const tokens = await this.generateTokens(user._id.toString(), user.email || '', user.role || 'user');
      await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
        },
        token: tokens.accessToken,
        ...tokens,
      };
    } catch (error: any) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      console.error('❌ Login Error:', error);
      throw new BadRequestException(`Login failed: ${error.message || error}`);
    }
  }

  // ─── Admin Login ─────────────────────────────────────────────────────────────

  async adminLogin(loginDto: LoginDto) {
    try {
      const email = loginDto.email?.trim()?.toLowerCase();
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }
      if (!user.password) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const roleStr = (user.role || '').toLowerCase();
      if (roleStr !== 'admin') {
        throw new UnauthorizedException('Access denied: Admin only');
      }
      const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
      await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
      return {
        success: true,
        message: 'Admin login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: tokens.accessToken,
        ...tokens,
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Admin Login Error:', error);
      throw new BadRequestException('Admin login failed: ' + (error?.message || error));
    }
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────
  
  
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const rtMatches = refreshToken === user.refreshToken;
    if (!rtMatches) {
      throw new UnauthorizedException('Access denied — invalid refresh token');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return tokens;
  }

  // ─── Forgot Password ────────────────────────────────────────────────────────
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      // Return success even if user not found (security best practice)
      return { message: 'If that email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.usersService.setResetToken(user.email, resetToken, expires);

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    try {
      await this.mailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch (_) { }

    return { message: 'If that email exists, a reset link has been sent' };
  }

  // ─── OTP-based Forgot Password Flow ───────────────────────────────────────
  async requestOtp(identifier: string) {
    if (!identifier) {
      throw new BadRequestException('Please enter your email or mobile number');
    }
    const cleanId = identifier.trim().toLowerCase();
    let user = await this.usersService.findByEmail(cleanId);
    if (!user && /^\d{10}$/.test(cleanId)) {
      user = await this.usersService.findByPhone(cleanId);
    }
    if (!user) {
      return { success: true, message: 'If an account exists with this email or mobile, an OTP has been sent.' };
    }

    const targetEmail = user.email;
    if (!targetEmail || targetEmail.endsWith('@santharisingh.com')) {
      throw new BadRequestException('No email address registered for this account. Please create an account or contact support.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.usersService.setOtp(targetEmail, otp, expires);

    // CRITICAL: Log the OTP to the console so developers and admins can see it instantly!
    console.log(`🔑 [OTP SYSTEM] Password Reset OTP for user "${targetEmail}" (phone: ${user.phone}) is: [${otp}]`);

    try {
      await this.mailService.sendOtpEmail(targetEmail, user.name || 'Valued Customer', otp);
    } catch (err) {
      console.warn('Mail send failed during requestOtp:', err.message);
    }

    const maskedEmail = targetEmail.replace(/(.{2})(.*)(?=@)/, '$1***');
    return {
      success: true,
      message: `A 6-digit OTP code has been sent to ${maskedEmail}`,
      email: targetEmail,
    };
  }

  async resetPasswordWithOtp(identifier: string, otp: string, newPassword: string) {
    if (!identifier || !otp || !newPassword) {
      throw new BadRequestException('Please provide email, OTP, and new password');
    }
    const cleanId = identifier.trim().toLowerCase();
    let user = await this.usersService.findByOtp(cleanId, otp);
    if (!user && /^\d{10}$/.test(cleanId)) {
      const phoneUser = await this.usersService.findByPhone(cleanId);
      if (phoneUser && phoneUser.email) {
        user = await this.usersService.findByOtp(phoneUser.email, otp);
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.resetPassword(user._id.toString(), hashedPassword);
    await this.usersService.clearOtp(user._id.toString());

    return { success: true, message: 'Password reset successfully' };
  }

  // ─── Reset Password ─────────────────────────────────────────────────────────
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(resetPasswordDto.token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);
    await this.usersService.resetPassword(user._id.toString(), hashedPassword);

    return { message: 'Password reset successfully' };
  }

  // ─── Get Current User ───────────────────────────────────────────────────────
  async getMe(userId: string) {
    return this.usersService.findById(userId);
  }

  // ─── Mobile Number + Password Auth Handlers ─────────────────────────────────
  async phoneRegister(data: { name: string; phone: string; password: string; email?: string }) {
    try {
      const cleaned = (data.phone || '').trim().replace(/\D/g, '');
      if (cleaned.length !== 10) {
        throw new BadRequestException('Please enter a valid 10-digit mobile number');
      }
      if (!data.name || data.name.trim().length < 2) {
        throw new BadRequestException('Please enter your full name');
      }
      if (!data.password || data.password.length < 4) {
        throw new BadRequestException('Password must be at least 4 characters');
      }

      let user = await this.usersService.findByPhone(cleaned);
      if (user && user.password) {
        throw new ConflictException('This mobile number is already registered. Please login.');
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);
      let email = data.email && data.email.trim() !== '' ? data.email.trim().toLowerCase() : `${cleaned}@santharisingh.com`;

      if (!user) {
        // Check if generated/provided email exists for another user
        const existingEmailUser = await this.usersService.findByEmail(email);
        if (existingEmailUser) {
          if (!data.email || data.email.trim() === '') {
            email = `${cleaned}_${Date.now()}@santharisingh.com`;
          } else {
            throw new ConflictException('This email is already registered with another account. Please use a different email or login.');
          }
        }

        user = await this.usersService.create({
          name: data.name.trim(),
          phone: cleaned,
          password: hashedPassword,
          email: email,
          role: 'user',
          isActive: true,
        } as any);
      } else {
        user.name = data.name.trim();
        user.password = hashedPassword;
        if (data.email && data.email.trim() !== '') {
          user.email = data.email.trim().toLowerCase();
        }
        await user.save();
      }

      const tokens = await this.generateTokens(user._id.toString(), user.email || '', user.role || 'user');
      await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

      return {
        success: true,
        message: 'Account created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
        },
        token: tokens.accessToken,
        ...tokens,
      };
    } catch (error: any) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      if (error?.code === 11000) {
        throw new ConflictException('An account with this mobile number or email already exists. Please login.');
      }
      console.error('Phone Register Error:', error);
      throw new BadRequestException(error?.message || 'Could not create account. Please try again.');
    }
  }

  async phoneLogin(data: { phone: string; password: string }) {
    try {
      const cleaned = (data.phone || '').trim().replace(/\D/g, '');
      if (cleaned.length !== 10) {
        throw new BadRequestException('Please enter a valid 10-digit mobile number');
      }
      if (!data.password) {
        throw new BadRequestException('Please enter your password');
      }

      const user = await this.usersService.findByPhone(cleaned);
      if (!user) {
        throw new UnauthorizedException('Mobile number not registered. Please create an account.');
      }

      if (!user.password) {
        throw new UnauthorizedException('No password set for this mobile number. Please create an account or reset password.');
      }

      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password. Please try again.');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      const tokens = await this.generateTokens(user._id.toString(), user.email || '', user.role || 'user');
      await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
        },
        token: tokens.accessToken,
        ...tokens,
      };
    } catch (error: any) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      console.error('Phone Login Error:', error);
      throw new BadRequestException(error?.message || 'Login failed. Please try again.');
    }
  }

  // ─── Mobile Number OTP Auth Handlers (Legacy) ─────────────────────────────────────────
  async sendPhoneOtp(rawPhone: string) {
    const cleaned = (rawPhone || '').trim().replace(/\D/g, '');
    if (cleaned.length !== 10) {
      throw new BadRequestException('Please enter a valid 10-digit mobile number');
    }

    let user = await this.usersService.findByPhone(cleaned);
    const isNewUser = !user || !user.email || !user.name;

    if (!user) {
      user = await this.usersService.createPhoneUser({ phone: cleaned });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.usersService.setPhoneOtp(cleaned, otp, expires);
    // Clean OTP generation & logging
    console.log(`📱 [PHONE OTP] Generated OTP for +91 ${cleaned}: [${otp}]`);

    // Fast2SMS Real SMS Gateway Dispatch (if FAST2SMS_API_KEY is set in .env)
    const fast2smsApiKey = this.configService.get<string>('FAST2SMS_API_KEY');
    if (fast2smsApiKey) {
      try {
        const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: cleaned,
          }),
        });
        const smsData = await smsRes.json();
        console.log(`📱 [FAST2SMS DISPATCH] Real SMS sent to +91 ${cleaned}:`, smsData);
      } catch (err) {
        console.error('⚠️ [FAST2SMS SMS ERROR]', err);
      }
    }

    return {
      success: true,
      isNewUser,
      message: `OTP sent successfully to +91 ${cleaned}`,
      otp,
    };
  }

  async verifyPhoneOtp(rawPhone: string, otp: string) {
    const cleaned = (rawPhone || '').trim().replace(/\D/g, '');
    const user = await this.usersService.findByPhoneAndOtp(cleaned, otp);
    if (!user) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    await this.usersService.clearPhoneOtp(cleaned);

    const isNewUser = !user.name || !user.email || user.name.startsWith('User ');
    if (isNewUser) {
      return {
        success: true,
        isNewUser: true,
        message: 'OTP verified. Please complete your registration details.',
        phone: cleaned,
      };
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email || '', user.role);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      success: true,
      isNewUser: false,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
      token: tokens.accessToken,
      ...tokens,
    };
  }

  async completePhoneRegistration(rawPhone: string, name: string, email: string) {
    const cleaned = (rawPhone || '').trim().replace(/\D/g, '');
    let user = await this.usersService.findByPhone(cleaned);

    if (!user) {
      user = await this.usersService.createPhoneUser({ phone: cleaned, name, email });
    } else {
      user.name = name;
      user.email = email;
      await user.save();
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email || '', user.role);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
      token: tokens.accessToken,
      ...tokens,
    };
  }


  // ─── Helpers ────────────────────────────────────────────────────────────────
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const secret = this.configService.get<string>('JWT_SECRET') || 'lokeshkumar';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'lokeshkumar';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: secret,
        expiresIn: this.configService.get<string>('ACCESS_TOKEN_TTL', '30d') as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: this.configService.get<string>('REFRESH_TOKEN_TTL', '7d') as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
