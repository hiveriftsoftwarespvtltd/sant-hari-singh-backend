import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  id: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '🌿' })
  emoji: string;

  @Prop({ default: '' })
  img: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 0 })
  count: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
