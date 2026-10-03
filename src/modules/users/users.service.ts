import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findById(id: string): Promise<UserDocument> {
    if (!id || !isValidObjectId(id)) {
      throw new NotFoundException('User not found');
    }
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User deleted successfully' };
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken });
  }

  async setResetToken(
    email: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { email },
      { resetPasswordToken: token, resetPasswordExpires: expires },
    );
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  // ─── Customer Address Operations ───────────────────────────────────────────
  async getAddresses(email: string): Promise<any[]> {
    const user = await this.userModel.findOne({ email }).exec();
    return user ? user.addresses || [] : [];
  }

  async addAddress(email: string, address: any): Promise<any[]> {
    let user = await this.userModel.findOne({ email }).exec();
    const addressId = address.id || `ADR-${Date.now()}`;
    const newAddress = { ...address, id: addressId };

    if (!user) {
      const name = [address.firstName, address.lastName].filter(Boolean).join(' ') || email.split('@')[0];
      user = new this.userModel({
        email,
        name,
        phone: address.phone || '',
        addresses: [newAddress],
      });
      await user.save();
      return user.addresses;
    }

    if (newAddress.isDefault) {
      user.addresses = (user.addresses || []).map((a) => ({
        ...a,
        isDefault: false,
      }));
    }

    user.addresses = user.addresses || [];
    user.addresses.push(newAddress);
    user.markModified('addresses');
    await user.save();
    return user.addresses;
  }

  async updateAddress(
    email: string,
    addressId: string,
    updatedFields: any,
  ): Promise<any[]> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) return [];

    user.addresses = (user.addresses || []).map((a) => {
      if (a.id === addressId) {
        return { ...a, ...updatedFields };
      }
      if (updatedFields.isDefault) {
        return { ...a, isDefault: false };
      }
      return a;
    });

    user.markModified('addresses');
    await user.save();
    return user.addresses;
  }

  async deleteAddress(email: string, addressId: string): Promise<any[]> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) return [];

    user.addresses = (user.addresses || []).filter((a) => a.id !== addressId);
    user.markModified('addresses');
    await user.save();
    return user.addresses;
  }

  // ─── Customer Profile Operations ───────────────────────────────────────────
  async updateProfile(
    email: string,
    name: string,
    phone: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();
    return user;
  }

  // ─── OTP Operations ────────────────────────────────────────────────────────
  async setOtp(email: string, otp: string, expires: Date): Promise<void> {
    await this.userModel.findOneAndUpdate({ email }, { otp, otpExpires: expires });
  }

  async findByOtp(email: string, otp: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      email,
      otp,
      otpExpires: { $gt: new Date() },
    });
  }

  async clearOtp(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      otp: null,
      otpExpires: null,
    });
  }

  // ─── Phone OTP Operations ───────────────────────────────────────────────────
  async findByPhone(phone: string): Promise<UserDocument | null> {
    const cleaned = (phone || '').trim().replace(/\D/g, '');
    return this.userModel.findOne({
      $or: [{ phone: cleaned }, { phone: `+91${cleaned}` }, { phone: `91${cleaned}` }]
    }).select('+password').exec();
  }

  async setPhoneOtp(phone: string, otp: string, expires: Date): Promise<void> {
    const cleaned = (phone || '').trim().replace(/\D/g, '');
    await this.userModel.findOneAndUpdate(
      { $or: [{ phone: cleaned }, { phone: `+91${cleaned}` }, { phone: `91${cleaned}` }] },
      { otp, otpExpires: expires },
      { new: true }
    );
  }

  async findByPhoneAndOtp(phone: string, otp: string): Promise<UserDocument | null> {
    const cleaned = (phone || '').trim().replace(/\D/g, '');
    return this.userModel.findOne({
      $or: [{ phone: cleaned }, { phone: `+91${cleaned}` }, { phone: `91${cleaned}` }],
      otp,
      otpExpires: { $gt: new Date() },
    }).exec();
  }

  async clearPhoneOtp(phone: string): Promise<void> {
    const cleaned = (phone || '').trim().replace(/\D/g, '');
    await this.userModel.findOneAndUpdate(
      { $or: [{ phone: cleaned }, { phone: `+91${cleaned}` }, { phone: `91${cleaned}` }] },
      { otp: null, otpExpires: null }
    );
  }

  async createPhoneUser(data: { phone: string; name?: string; email?: string }): Promise<UserDocument> {
    const cleaned = (data.phone || '').trim().replace(/\D/g, '');
    const user = new this.userModel({
      phone: cleaned,
      name: data.name || `User ${cleaned.slice(-4)}`,
      email: data.email || null,
      role: 'user',
      isActive: true,
    });
    return user.save();
  }
}
