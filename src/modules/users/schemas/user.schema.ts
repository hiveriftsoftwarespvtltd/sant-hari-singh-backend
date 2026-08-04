import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: false, trim: true, default: '' })
  name: string;

  @Prop({ required: false, unique: false, lowercase: true, trim: true, sparse: true, default: null })
  email: string;

  @Prop({ required: false, select: false, default: null })
  password: string;

  @Prop({ default: UserRole.USER, enum: UserRole })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  refreshToken: string;

  @Prop({ default: null })
  resetPasswordToken: string;

  @Prop({ default: null })
  resetPasswordExpires: Date;

  @Prop({ default: null })
  otp: string;

  @Prop({ default: null })
  otpExpires: Date;

  @Prop({ default: null })
  avatar: string;

  @Prop({ default: null, index: true })
  phone: string;

  @Prop({ type: [Object], default: [] })
  addresses: any[];
}

export const UserSchema = SchemaFactory.createForClass(User);
