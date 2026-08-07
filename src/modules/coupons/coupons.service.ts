import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
    if (!code) return null;
    return this.couponModel.findOne({ code: code.trim().toUpperCase() }).exec();
  }

  async create(createDto: Partial<Coupon>): Promise<CouponDocument> {
    try {
      if (createDto.code) {
        createDto.code = createDto.code.trim().toUpperCase();
      }
      if (!createDto.code) {
        throw new BadRequestException('Coupon code is required');
      }

      const existing = await this.couponModel.findOne({ code: createDto.code }).exec();
      if (existing) {
        throw new ConflictException(`Coupon code "${createDto.code}" already exists. Please use a different code.`);
      }

      // Sync legacy/helper properties
      const discountVal = createDto.discountValue || 0;
      const discType = createDto.discountType || 'percentage';
      createDto.discount = discountVal;
      createDto.type = discType === 'percentage' ? 'percent' : 'fixed';
      createDto.active = createDto.status === 'active';

      // Clean up transient id props before saving to Mongoose
      delete (createDto as any).id;
      delete (createDto as any)._id;

      const coupon = new this.couponModel(createDto);
      return await coupon.save();
    } catch (error: any) {
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new ConflictException(`Coupon code "${createDto.code}" already exists. Please use a different code.`);
      }
      console.error('❌ Coupon create error:', error);
      throw new BadRequestException(error.message || 'Failed to create coupon');
    }
  }

  async update(id: string, updateDto: Partial<Coupon>): Promise<CouponDocument> {
    try {
      if (updateDto.code) {
        updateDto.code = updateDto.code.trim().toUpperCase();
        const existing = await this.couponModel.findOne({ code: updateDto.code }).exec();
        if (existing && existing._id.toString() !== id) {
          throw new ConflictException(`Coupon code "${updateDto.code}" is already used by another coupon.`);
        }
      }

      delete (updateDto as any).id;
      delete (updateDto as any)._id;

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
    } catch (error: any) {
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new ConflictException(`Coupon code "${updateDto.code}" is already in use.`);
      }
      console.error('❌ Coupon update error:', error);
      throw new BadRequestException(error.message || 'Failed to update coupon');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const coupon = await this.couponModel.findByIdAndDelete(id).exec();
      if (!coupon) throw new NotFoundException('Coupon not found');
      return { message: 'Coupon deleted successfully' };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      console.error('❌ Coupon remove error:', error);
      throw new BadRequestException(error.message || 'Failed to delete coupon');
    }
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
