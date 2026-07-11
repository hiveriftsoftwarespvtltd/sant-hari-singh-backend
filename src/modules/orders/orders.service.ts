import { Injectable, NotFoundException, ForbiddenException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, PaymentStatus } from './schemas/order.schema';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { CouponsService } from '../coupons/coupons.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    private readonly couponsService: CouponsService,
  ) {}

  async onModuleInit() {
    await this.dropIdIndex();
  }

  async dropIdIndex() {
    try {
      await this.orderModel.collection.dropIndex('id_1');
      console.log('✅ Dropped unique index id_1 from orders collection.');
    } catch (err) {
      console.log('ℹ️ id_1 index drop on orders collection skipped or already dropped.');
    }
  }

  async create(orderPayload: any): Promise<OrderDocument> {
    const {
      customerId,
      customer,
      email,
      phone,
      address1,
      address2,
      city,
      state,
      pincode,
      items,
      total,
      shipping,
      discount,
      paymentMethod,
      paymentId,
      notes,
      shippingAddress,
      promoCode,
    } = orderPayload;

    // Find or create customer
    let user: any = null;
    if (customerId && Types.ObjectId.isValid(customerId)) {
      user = await this.usersService.findById(customerId);
    }
    if (!user && email) {
      user = await this.usersService.findByEmail(email);
    }
    if (!user) {
      // Create guest user
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      user = await this.usersService.create({
        name: customer || 'Guest Customer',
        email: email || `guest-${Date.now()}@santharising.com`,
        phone: phone || '',
        password: hashedPassword,
        isActive: true,
      } as any);
    }

    // Map items
    const mappedItems = (items || []).map((item: any) => ({
      product: Types.ObjectId.isValid(item.id)
        ? new Types.ObjectId(item.id)
        : new Types.ObjectId(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.img || '',
    }));

    // Map shippingAddress
    const shipAddr = {
      fullName: shippingAddress?.fullName || customer || 'Guest Customer',
      phone: shippingAddress?.phone || phone || '',
      addressLine1: shippingAddress?.address1 || address1 || '',
      addressLine2: shippingAddress?.address2 || address2 || '',
      city: shippingAddress?.city || city || '',
      state: shippingAddress?.state || state || '',
      pincode: shippingAddress?.pincode || pincode || '',
      country: shippingAddress?.country || 'India',
    };

    const order = new this.orderModel({
      user: user._id,
      items: mappedItems,
      shippingAddress: shipAddr,
      totalAmount: total,
      shippingCharge: shipping || 0,
      discount: discount || 0,
      paymentMethod: paymentMethod || 'cod',
      paymentId: paymentId || '',
      status: 'pending',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      notes: notes || '',
    });

    const saved = await order.save();

    // Increment coupon usage count if coupon was used
    if (promoCode) {
      await this.couponsService.useCoupon(promoCode);
    }

    // Send order confirmation email
    try {
      await this.mailService.sendOrderConfirmationEmail(
        user.email,
        user.name,
        saved._id.toString(),
        mappedItems,
        total,
      );
    } catch (_) {}

    return saved;
  }

  async findMyOrders(userId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('items.product', 'name images')
      .sort('-createdAt')
      .exec();
  }

  async findByEmail(email: string): Promise<OrderDocument[]> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return [];
    return this.orderModel
      .find({ user: user._id })
      .sort('-createdAt')
      .exec();
  }

  async findById(id: string, userId?: string, isAdmin = false): Promise<OrderDocument> {
    const order = await this.orderModel
      .findById(id)
      .populate('user', 'name email')
      .exec();

    if (!order) throw new NotFoundException('Order not found');

    if (!isAdmin && order.user['_id'].toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async findAll(): Promise<OrderDocument[]> {
    return this.orderModel
      .find()
      .populate('user', 'name email')
      .sort('-createdAt')
      .exec();
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: any,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status: updateOrderStatusDto.status },
      { new: true },
    );
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.user.toString() !== userId) throw new ForbiddenException('Access denied');
    if (['shipped', 'delivered'].includes(order.status)) {
      throw new ForbiddenException('Cannot cancel a shipped or delivered order');
    }
    order.status = 'cancelled' as any;
    return order.save();
  }

  // ─── Razorpay Mocks & Verifications ─────────────────────────────────────────
  async createRazorpayOrder(amount: number) {
    // Return mock order id for development
    const orderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      success: true,
      key_id: 'rzp_test_mockkey_santharising',
      amount: amount * 100, // in paise
      currency: 'INR',
      razorpay_order_id: orderId,
    };
  }

  async verifyRazorpayPayment(payload: any) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = payload;

    // Direct mock validation for ease of local testing
    if (razorpay_order_id.startsWith('order_mock_')) {
      const order = await this.create({
        ...orderData,
        paymentId: razorpay_payment_id,
        paymentStatus: 'paid',
      });
      return { success: true, orderId: order._id.toString() };
    }

    // Fallback: auto-approve
    const order = await this.create({
      ...orderData,
      paymentId: razorpay_payment_id,
      paymentStatus: 'paid',
    });
    return { success: true, orderId: order._id.toString() };
  }

  // ─── CCAvenue Integration ──────────────────────────────────────────────────
  async initiateCCAvenue(orderPayload: any): Promise<any> {
    // Create the pending order first
    const savedOrder = await this.create(orderPayload);
    const orderId = savedOrder._id.toString();

    // Fetch credentials
    const merchantId = process.env.CCAVENUE_MERCHANT_ID || '4450335';
    const accessCode = process.env.CCAVENUE_ACCESS_CODE || 'AVRB93NF39AZ92BRZA';
    const workingKey = process.env.CCAVENUE_WORKING_KEY || '959DAD940248A0100BC53241FB026330';
    const mode = process.env.CCAVENUE_MODE || 'test';

    const actionUrl = mode === 'production'
      ? 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
      : 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction';

    // Backend redirect URL
    const backendUrl = process.env.SERVER_BASE_URL || 'https://santharisingh.com/santharisingh_api';
    const redirectUrl = `${backendUrl}/api/orders/ccavenue/redirect`;

    const billingAddress = orderPayload.shippingAddress || {};
    const params: Record<string, string> = {
      merchant_id: merchantId,
      order_id: orderId,
      amount: (orderPayload.total || orderPayload.totalAmount || 0).toString(),
      currency: 'INR',
      redirect_url: redirectUrl,
      cancel_url: redirectUrl,
      language: 'EN',
      billing_name: billingAddress.fullName || orderPayload.customer || 'Customer',
      billing_address: billingAddress.addressLine1 || orderPayload.address1 || 'Address',
      billing_city: billingAddress.city || orderPayload.city || 'City',
      billing_state: billingAddress.state || orderPayload.state || 'State',
      billing_zip: billingAddress.pincode || orderPayload.pincode || 'Zip',
      billing_country: 'India',
      billing_tel: billingAddress.phone || orderPayload.phone || '',
      billing_email: orderPayload.email || '',
      delivery_name: billingAddress.fullName || orderPayload.customer || 'Customer',
      delivery_address: billingAddress.addressLine1 || orderPayload.address1 || 'Address',
      delivery_city: billingAddress.city || orderPayload.city || 'City',
      delivery_state: billingAddress.state || orderPayload.state || 'State',
      delivery_zip: billingAddress.pincode || orderPayload.pincode || 'Zip',
      delivery_country: 'India',
      delivery_tel: billingAddress.phone || orderPayload.phone || '',
    };

    const paramString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');

    // Encrypt request params using CCAvenue helper
    const encRequest = this.encryptCCAvenue(paramString, workingKey);

    return {
      success: true,
      actionUrl,
      encRequest,
      accessCode,
      orderId,
    };
  }

  async handleCCAvenueResponse(encResp: string): Promise<any> {
    const workingKey = process.env.CCAVENUE_WORKING_KEY || '959DAD940248A0100BC53241FB026330';
    
    // Decrypt the response
    const decrypted = this.decryptCCAvenue(encResp, workingKey);
    
    const params: Record<string, string> = {};
    decrypted.split('&').forEach(pair => {
      const parts = pair.split('=');
      if (parts.length === 2) {
        params[parts[0]] = parts[1];
      }
    });

    const orderId = params.order_id;
    const orderStatus = params.order_status; // 'Success', 'Failure', 'Aborted'
    const trackingId = params.tracking_id || '';
    const failureMessage = params.failure_message || 'Payment failed. Please try again.';

    if (!orderId) {
      throw new BadRequestException('Order ID is missing in CCAvenue response');
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://santharisingh.com';

    if (orderStatus === 'Success') {
      order.status = 'confirmed' as any;
      order.paymentStatus = PaymentStatus.PAID;
      order.paymentId = trackingId;
      await order.save();
      return {
        success: true,
        orderId,
        redirectUrl: `${frontendUrl}/order-confirm?orderId=${orderId}`,
      };
    } else {
      order.status = 'cancelled' as any;
      order.paymentStatus = PaymentStatus.FAILED;
      await order.save();
      return {
        success: false,
        orderId,
        redirectUrl: `${frontendUrl}/cart?error=${encodeURIComponent(failureMessage)}`,
      };
    }
  }

  // ─── CCAvenue Cryto Helpers ────────────────────────────────────────────────
  private encryptCCAvenue(plainText: string, workingKey: string): string {
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = m.digest();
    const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encoded = cipher.update(plainText, 'utf8', 'hex');
    encoded += cipher.final('hex');
    return encoded;
  }

  private decryptCCAvenue(encText: string, workingKey: string): string {
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = m.digest();
    const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    let decoded = decipher.update(encText, 'hex', 'utf8');
    decoded += decipher.final('utf8');
    return decoded;
  }
}
