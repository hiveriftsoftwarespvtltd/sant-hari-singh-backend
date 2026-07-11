import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ default: 'percentage' })
  discountType: string;

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ default: 0 })
  minOrderValue: number;

  @Prop({ default: null })
  maxDiscount: number;

  @Prop({ default: null })
  expiryDate: string;

  @Prop({ default: null })
  usageLimit: number;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: 'active' })
  status: string;

  // Sync helpers to keep backward compatibility
  @Prop({ default: 'percentage' })
  type: string;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: true })
  active: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
