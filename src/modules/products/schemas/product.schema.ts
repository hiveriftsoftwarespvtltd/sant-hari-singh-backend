import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductCategory {
  DIGESTIVE_CARE = 'digestive-care',
  DIABETES_CARE = 'diabetes-care',
  LIVER_CARE = 'liver-care',
  JOINT_BONE_CARE = 'joint-bone-care',
  HERBAL_POWDERS = 'herbal-powders',
  RAW_HERBS = 'raw-herbs',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  sku: string;

  @Prop({ default: 'SANT HARI SINGH' })
  brand: string;

  @Prop({ default: '' })
  slug: string;

  @Prop({ default: '' })
  subtitle: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  shortDescription: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 0, min: 0 })
  originalPrice: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true, min: 0 })
  stock: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: '' })
  img: string;

  @Prop({ type: [String], default: [] })
  imgs: string[];

  @Prop({ default: 'other' })
  category: string;

  @Prop({ default: '' })
  subCategory: string;

  @Prop({ default: '' })
  section: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false })
  isNew: boolean;

  @Prop({ default: false })
  isBestseller: boolean;

  @Prop({ default: 5.0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: 0 })
  reviews: number;

  @Prop({ type: [String], default: ['Standard'] })
  sizes: string[];

  @Prop({ default: 'Standard' })
  selectedSize: string;

  @Prop({ type: [Object], default: [] })
  variants: any[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: null })
  seo: any;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
