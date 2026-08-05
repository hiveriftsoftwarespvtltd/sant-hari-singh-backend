import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product' })
  product: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: 1, min: 1 })
  quantity: number;

  @Prop({ default: '' })
  image: string;
}

class ShippingAddress {
  @Prop({ default: '' })
  fullName: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  addressLine1: string;

  @Prop({ default: '' })
  addressLine2: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  state: string;

  @Prop({ default: '' })
  pincode: string;

  @Prop({ default: 'India' })
  country: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ default: '' })
  id: string;

  @Prop({ default: 1000 })
  orderNumber: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  user: Types.ObjectId;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({ type: ShippingAddress, default: null })
  shippingAddress: ShippingAddress;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ default: 0, min: 0 })
  shippingCharge: number;

  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ default: OrderStatus.PENDING, enum: OrderStatus })
  status: OrderStatus;

  @Prop({ default: PaymentStatus.PENDING, enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @Prop({ default: '' })
  paymentMethod: string;

  @Prop({ default: '' })
  paymentId: string;

  @Prop({ default: '' })
  notes: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
