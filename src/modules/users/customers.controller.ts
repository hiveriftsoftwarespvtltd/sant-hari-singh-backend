import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  // GET /api/customers — Fetch all users for Admin
  @Get()
  async findAll() {
    const list = await this.usersService.findAll();
    return list.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone || 'Not specified',
      city: 'Mumbai', // fallback match
      joined: new Date((u as any).createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    }));
  }

  // POST /api/customers/register — Public
  @Post('register')
  async register(@Body() body: any) {
    try {
      const { firstName, lastName, email, phone, password, city } = body;
      if (!email || !password || !firstName) {
        throw new BadRequestException('Required fields missing');
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await this.usersService.findByEmail(cleanEmail);
      if (existing) {
        if (existing.isActive) {
          throw new BadRequestException('Email already registered. Please login.');
        }
        // If user exists but is not active (unverified registration), allow updating details and sending a new OTP
        const hashedPassword = await bcrypt.hash(password, 12);
        existing.name = `${firstName} ${lastName || ''}`.trim();
        existing.password = hashedPassword;
        existing.phone = phone;
        await existing.save();
      } else {
        const hashedPassword = await bcrypt.hash(password, 12);
        await this.usersService.create({
          name: `${firstName} ${lastName || ''}`.trim(),
          email: cleanEmail,
          password: hashedPassword,
          phone,
          isActive: false, // Inactive until verified via OTP
        } as any);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
      await this.usersService.setOtp(cleanEmail, otp, expires);

      // CRITICAL: Log the OTP to the console so developers and admins can see it instantly!
      console.log(`🔑 [REGISTRATION OTP SYSTEM] OTP for user "${cleanEmail}" is: [${otp}]`);

      // Send email with verification OTP code (non-blocking so SMTP delays or errors never crash registration)
      const fullName = `${firstName} ${lastName || ''}`.trim();
      this.mailService.sendRegistrationOtpEmail(cleanEmail, fullName, otp).catch((err: any) => {
        console.warn(`Failed to send registration email to ${cleanEmail}:`, err?.message || err);
      });

      return {
        success: true,
        pendingVerification: true,
        email: cleanEmail,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      if (error?.code === 11000) {
        throw new ConflictException('An account with this email or mobile number already exists. Please login.');
      }
      console.error('Customer Register Error:', error);
      throw new BadRequestException(error?.message || 'Registration failed. Please check your details and try again.');
    }
  }

  // POST /api/customers/verify-registration — Public
  @Post('verify-registration')
  async verifyRegistration(@Body() body: { email: string; otp: string }) {
    const { email, otp } = body;
    if (!email || !otp) {
      throw new BadRequestException('Email and OTP are required');
    }

    const user = await this.usersService.findByOtp(email, otp);
    if (!user) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    user.isActive = true;
    await (user as any).save();
    await this.usersService.clearOtp(user._id.toString());

    return {
      success: true,
      message: 'Account verified successfully. You can now login!',
    };
  }


  // GET /api/customers/addresses — Public (reads email from query)
  @Get('addresses')
  async getAddresses(@Query('email') email: string) {
    if (!email) throw new BadRequestException('Email query parameter is required');
    const addresses = await this.usersService.getAddresses(email);
    return { success: true, addresses };
  }

  // POST /api/customers/addresses — Public (reads email and address from body)
  @Post('addresses')
  async addAddress(@Body() body: any) {
    const { email, address } = body;
    if (!email || !address) throw new BadRequestException('Email and address details required');
    const addresses = await this.usersService.addAddress(email, address);
    return { success: true, addresses };
  }

  // POST /api/customers/addresses/update — Public
  @Post('addresses/update')
  async updateAddress(@Body() body: any) {
    const { email, addressId, updatedFields } = body;
    if (!email || !addressId || !updatedFields) {
      throw new BadRequestException('Required fields missing');
    }
    const addresses = await this.usersService.updateAddress(email, addressId, updatedFields);
    return { success: true, addresses };
  }

  // POST /api/customers/addresses/delete — Public
  @Post('addresses/delete')
  async deleteAddress(@Body() body: any) {
    const { email, addressId } = body;
    if (!email || !addressId) {
      throw new BadRequestException('Required fields missing');
    }
    const addresses = await this.usersService.deleteAddress(email, addressId);
    return { success: true, addresses };
  }

  // POST /api/customers/profile/update — Public
  @Post('profile/update')
  async updateProfile(@Body() body: any) {
    const { email, name, phone } = body;
    if (!email) throw new BadRequestException('Email is required');
    const saved = await this.usersService.updateProfile(email, name, phone);
    return {
      success: true,
      customer: {
        id: saved._id.toString(),
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
      },
    };
  }
}
