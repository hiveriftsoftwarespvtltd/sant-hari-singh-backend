import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from './schemas/coupon.schema';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  async findAll(): Promise<Coupon[]> {
    return this.couponModel.find().exec();
  }

  async findOne(id: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async findByCode(code: string): Promise<CouponDocument | null> {
    return this.couponModel.findOne({ code: code.toUpperCase() }).exec();
  }

  async create(createDto: Partial<Coupon>): Promise<CouponDocument> {
    if (createDto.code) {
      createDto.code = createDto.code.toUpperCase();
    }
    const existing = await this.couponModel.findOne({ code: createDto.code }).exec();
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    // Sync legacy/helper properties
    const discountVal = createDto.discountValue || 0;
    const discType = createDto.discountType || 'percentage';
    createDto.discount = discountVal;
    createDto.type = discType === 'percentage' ? 'percent' : 'fixed';
    createDto.active = createDto.status === 'active';

    const coupon = new this.couponModel(createDto);
    return coupon.save();
  }

  async update(id: string, updateDto: Partial<Coupon>): Promise<CouponDocument> {
    if (updateDto.code) {
      updateDto.code = updateDto.code.toUpperCase();
    }

    // Sync legacy/helper properties if updated
    if (updateDto.discountValue !== undefined || updateDto.discountType !== undefined || updateDto.status !== undefined) {
      const discVal = updateDto.discountValue !== undefined ? updateDto.discountValue : 0;
      const discType = updateDto.discountType || 'percentage';
      updateDto.discount = discVal;
      updateDto.type = discType === 'percentage' ? 'percent' : 'fixed';
      if (updateDto.status !== undefined) {
        updateDto.active = updateDto.status === 'active';
      }
    }

    const coupon = await this.couponModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async remove(id: string): Promise<{ message: string }> {
    const coupon = await this.couponModel.findByIdAndDelete(id).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return { message: 'Coupon deleted successfully' };
  }

  async useCoupon(code: string): Promise<void> {
    if (!code) return;
    try {
      const coupon = await this.findByCode(code);
      if (!coupon) return;

      coupon.usageCount = (coupon.usageCount || 0) + 1;
      if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
        coupon.status = 'expired';
        coupon.active = false;
      }
      await coupon.save();
      console.log(`🎟️ Incremented usageCount for coupon ${code} to ${coupon.usageCount}`);
    } catch (err) {
      console.error(`⚠️ Failed to update usageCount for coupon ${code}:`, err);
    }
  }
}
