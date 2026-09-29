import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // GET /api/coupons — Public
  private mapCoupon(c: any) {
    return {
      id: c._id.toString(),
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderValue: c.minOrderValue,
      maxDiscount: c.maxDiscount,
      expiryDate: c.expiryDate,
      usageLimit: c.usageLimit,
      usageCount: c.usageCount,
      status: c.status,
      
      // CartContext.jsx compatibility
      type: c.type,
      value: c.discountValue,
      minSubtotal: c.minOrderValue,
      enabled: c.status === 'active',
      desc: c.discountType === 'percentage' ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`
    };
  }

  // GET /api/coupons — Public
  @Get()
  async findAll() {
    const coupons = await this.couponsService.findAll();
    return coupons.map((c: any) => this.mapCoupon(c));
  }

  // POST /api/coupons/validate — Public
  @Post('validate')
  async validate(@Body() body: { code: string; subtotal?: number }) {
    if (!body.code) {
      return { success: false, message: 'Please enter a coupon code.' };
    }
    const coupon = await this.couponsService.findByCode(body.code);
    if (!coupon) {
      return { success: false, message: 'Invalid coupon code.' };
    }

    if (coupon.status !== 'active' || coupon.active === false) {
      return { success: false, message: 'This coupon is inactive.' };
    }

    if (coupon.expiryDate) {
      const expiry = new Date(coupon.expiryDate);
      if (expiry < new Date()) {
        return { success: false, message: 'This coupon has expired.' };
      }
    }

    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
      return { success: false, message: 'This coupon usage limit has been reached.' };
    }

    if (body.subtotal !== undefined) {
      const minVal = coupon.minOrderValue || 0;
      if (body.subtotal < minVal) {
        return {
          success: false,
          message: `This coupon requires a minimum subtotal of ₹${minVal.toLocaleString('en-IN')}.`,
        };
      }
    }

    return {
      success: true,
      message: 'Coupon applied successfully!',
      coupon: this.mapCoupon(coupon),
    };
  }

  // POST /api/coupons/add — Admin

  @Post('add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createDto: any) {
    const saved = await this.couponsService.create(createDto);
    return {
      success: true,
      coupon: this.mapCoupon(saved),
    };
  }

  // POST /api/coupons/:id/update — Admin
  @Post(':id/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: any) {
    const saved = await this.couponsService.update(id, updateDto);
    return {
      success: true,
      coupon: this.mapCoupon(saved),
    };
  }

  // POST /api/coupons/:id/delete — Admin
  @Post(':id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.couponsService.remove(id);
    return { success: true };
  }
}
