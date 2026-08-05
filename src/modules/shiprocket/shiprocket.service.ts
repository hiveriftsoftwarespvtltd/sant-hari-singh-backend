import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { UsersService } from '../users/users.service';

/**
 * Converts any string/ObjectId/number into a deterministic, unique positive Integer (Number)
 */
function toNumericId(val: any): number {
  if (typeof val === 'number' && !isNaN(val) && val > 0) {
    return Math.floor(val);
  }
  const str = String(val || '').trim();
  if (/^\d+$/.test(str)) {
    const parsed = parseInt(str, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Hex 24-char ObjectId
  if (str.length >= 8) {
    const hexSlice = str.slice(-8);
    const parsedHex = parseInt(hexSlice, 16);
    if (!isNaN(parsedHex) && parsedHex > 0) {
      return parsedHex;
    }
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 100000;
}

@Injectable()
export class ShiprocketService {
  private shiprocketToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) { }

  /**
   * Step 1: Get Access Token from Shiprocket API
   */
  async getToken(): Promise<string | null> {
    if (this.shiprocketToken && Date.now() < this.tokenExpiresAt) {
      return this.shiprocketToken;
    }

    const email = this.configService.get<string>('SHIPROCKET_EMAIL') || 'api3@santharisingh.com';
    const password = this.configService.get<string>('SHIPROCKET_PASSWORD') || 'HrAs7fZ9w47CayM91%*&GIJ5b3%mWa%n';

    try {
      const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Shiprocket-NestJS-Client',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data && data.token) {
        this.shiprocketToken = data.token;
        this.tokenExpiresAt = Date.now() + 8 * 24 * 60 * 60 * 1000;
        console.log('🔑 [SHIPROCKET AUTH] Access token generated successfully');
        return this.shiprocketToken;
      }
      console.warn('⚠️ [SHIPROCKET AUTH] Login response without token:', data);
      return null;
    } catch (err) {
      console.error('❌ [SHIPROCKET AUTH ERROR]', err);
      return null;
    }
  }

  /**
   * Step 2: Send OTP API (Mobile Number Checkout)
   */
  async sendOtp(rawMobile: string) {
    const cleaned = (rawMobile || '').trim().replace(/\D/g, '');
    if (cleaned.length !== 10) {
      throw new BadRequestException('Please enter a valid 10-digit mobile number');
    }

    let user = await this.usersService.findByPhone(cleaned);
    const isNewUser = !user || !user.email || !user.name;

    if (!user) {
      user = await this.usersService.createPhoneUser({ phone: cleaned });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.setPhoneOtp(cleaned, otp, expires);
    console.log(`📱 [SHIPROCKET OTP SERVICE] Generated OTP for +91 ${cleaned}: [${otp}]`);

    // Fetch Token
    const token = await this.getToken();
    if (token) {
      try {
        const srRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mobile: cleaned, otp }),
        });
        const srData = await srRes.json();
        console.log('📦 [SHIPROCKET OTP API RESPONSE]', srData);
      } catch (err) {
        console.error('⚠️ Shiprocket OTP API Error:', err);
      }
    }

    return {
      success: true,
      isNewUser,
      message: `OTP sent successfully to +91 ${cleaned}`,
    };
  }

  /**
   * Step 3: Verify OTP API
   */
  async verifyOtp(rawMobile: string, otp: string) {
    const cleaned = (rawMobile || '').trim().replace(/\D/g, '');
    const user = await this.usersService.findByPhoneAndOtp(cleaned, otp);

    if (!user) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    await this.usersService.clearPhoneOtp(cleaned);

    return {
      success: true,
      message: 'OTP verified successfully',
      isNewUser: !user.name || !user.email || user.name.startsWith('User '),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }


  /**
   * Helper to format a single product to Shiprocket SRC format matching exact target sample schema
   */
  private formatProduct(product: any, baseUrl: string) {
    const numericProductId = toNumericId(product.id || product._id);
    const productPrice = String(product.price || 0);
    const compareAtPrice = product.originalPrice ? String(product.originalPrice) : String(product.price || 0);
    const quantity = typeof product.stock === 'number' ? product.stock : 100;
    const sku = product.sku || `SHS-${numericProductId.toString().slice(-4)}`;
    const title = product.name || 'Untitled Product';
    const handle = product.slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    const description = product.description || product.shortDescription || title;

    // Process images
    const rawImages = [
      ...(Array.isArray(product.images) ? product.images : []),
      ...(product.img ? [product.img] : []),
      ...(Array.isArray(product.imgs) ? product.imgs : []),
    ];
    const uniqueImages = Array.from(new Set(rawImages.filter((img) => typeof img === 'string' && img.trim() !== '')));

    const mainImageSrc = uniqueImages.length > 0
      ? (uniqueImages[0].startsWith('http://') || uniqueImages[0].startsWith('https://')
        ? uniqueImages[0]
        : `${baseUrl}${uniqueImages[0].startsWith('/') ? uniqueImages[0] : '/' + uniqueImages[0]}`)
      : `${baseUrl}/images/product.png`;

    // Handle variants according to exact target sample structure
    let variants: any[] = [];
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      variants = product.variants.map((v: any, idx: number) => {
        const variantId = v._id || v.id ? toNumericId(v._id || v.id) : (numericProductId * 10 + idx + 1);
        const varTitle = v.title || v.name || v.size || 'Standard';

        let variantImgSrc = mainImageSrc;
        if (v.image && typeof v.image === 'string' && v.image.trim() !== '') {
          variantImgSrc = v.image.startsWith('http://') || v.image.startsWith('https://')
            ? v.image
            : `${baseUrl}${v.image.startsWith('/') ? v.image : '/' + v.image}`;
        }

        return {
          id: variantId,
          title: varTitle,
          price: String(v.price || productPrice),
          compare_at_price: v.originalPrice ? String(v.originalPrice) : compareAtPrice,
          sku: v.sku || `${sku}-${idx + 1}`,
          created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
          updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
          taxable: true,
          quantity: typeof v.stock === 'number' ? v.stock : quantity,
          grams: v.grams || (v.weight ? Number(v.weight) * 1000 : 500),
          image: {
            src: variantImgSrc,
          },
          option_values: {
            Title: varTitle,
          },
          weight: v.weight ? Number(v.weight) : 0.5,
          weight_unit: 'kg',
        };
      });
    } else {
      variants = [
        {
          id: numericProductId * 10 + 1,
          title: 'Standard',
          price: productPrice,
          compare_at_price: compareAtPrice,
          sku: sku,
          created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
          updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
          taxable: true,
          quantity: quantity,
          grams: 500,
          image: {
            src: mainImageSrc,
          },
          option_values: {
            Title: 'Standard',
          },
          weight: 0.5,
          weight_unit: 'kg',
        },
      ];
    }

    const optionValues = Array.from(new Set(variants.map((v: any) => v.title)));
    const options = [
      {
        name: 'Title',
        values: optionValues.length > 0 ? optionValues : ['Standard'],
      },
    ];

    return {
      id: numericProductId,
      title: title,
      body_html: `<p>${description}</p>`,
      vendor: product.brand || 'SANT HARI SINGH',
      product_type: product.category || 'Ayurvedic',
      created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
      handle: handle,
      updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
      tags: Array.isArray(product.tags) && product.tags.length > 0
        ? product.tags.join(', ')
        : (product.category || 'Ayurveda'),
      status: product.isActive !== false ? 'active' : 'draft',
      variants: variants,
      options: options,
      image: {
        src: mainImageSrc,
      },
    };
  }

  /**
   * GET /shiprocket/products?page=1&limit=100 OR ?collection_id=liver-care&page=1&limit=100
   */
  async getProducts(collectionId?: string, pageParam: number = 1, limitParam: number = 100, hostHeader?: string) {
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(250, Math.max(1, Number(limitParam) || 100));
    const skip = (page - 1) * limit;

    const filter: any = { isActive: true };

    if (collectionId && String(collectionId).trim() !== '') {
      const strId = String(collectionId).trim();
      const numId = toNumericId(strId);

      // Find matching category to extract slug
      const matchedCats = await this.categoryModel.find({
        $or: [
          { id: numId },
          { slug: strId },
          { name: new RegExp(strId, 'i') },
        ],
      }).exec();

      const catSlugs = Array.from(new Set([strId, ...matchedCats.map((c) => c.slug)]));

      const orConditions: any[] = [];
      for (const s of catSlugs) {
        orConditions.push({ category: s });
        orConditions.push({ subCategory: s });
        orConditions.push({ slug: s });
      }
      filter.$or = orConditions;
    }

    const [dbProducts, total] = await Promise.all([
      this.productModel.find(filter).skip(skip).limit(limit).exec(),
      this.productModel.countDocuments(filter),
    ]);

    const baseUrl = hostHeader ? `https://${hostHeader}` : 'https://santharisingh.com';

    const formattedProducts = dbProducts.map((p) => this.formatProduct(p, baseUrl));

    return {
      data: {
        total,
        products: formattedProducts,
      },
    };
  }

  /**
   * GET /shiprocket/collections?page=1&limit=100 matching exact target example schema
   */
  async getCollections(pageParam: number = 1, limitParam: number = 100, hostHeader?: string) {
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(250, Math.max(1, Number(limitParam) || 100));
    const skip = (page - 1) * limit;

    const [dbCategories, total] = await Promise.all([
      this.categoryModel.find({ enabled: { $ne: false } }).skip(skip).limit(limit).exec(),
      this.categoryModel.countDocuments({ enabled: { $ne: false } }),
    ]);

    const baseUrl = hostHeader ? `https://${hostHeader}` : 'https://santharisingh.com';

    // Format categories as Shiprocket collections matching target example schema exactly
    const collections = dbCategories.map((cat) => {
      const numericCatId = toNumericId(cat.id || (cat as any)._id || cat.slug);

      let imgSrc = (cat as any).img;
      if (!imgSrc || typeof imgSrc !== 'string' || imgSrc.trim() === '') {
        imgSrc = '/images/category.png';
      }
      if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://')) {
        imgSrc = `${baseUrl}${imgSrc.startsWith('/') ? imgSrc : '/' + imgSrc}`;
      }

      return {
        id: numericCatId,
        updated_at: (cat as any).updatedAt ? new Date((cat as any).updatedAt).toISOString() : new Date().toISOString(),
        body_html: `<p>${cat.name || ''}</p>`,
        handle: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
        image: {
          src: imgSrc,
        },
        title: cat.name || 'Category',
        created_at: (cat as any).createdAt ? new Date((cat as any).createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return {
      data: {
        total,
        collections,
      },
    };
  }

  /**
   * Webhook handlers (Order Sync / Inventory Sync)
   */
  async handleOrderSync(data: any) {
    console.log('📦 Shiprocket Order Sync Webhook received:', JSON.stringify(data));
    try {
      const payload = data.order || data.current || data;
      const orderIdStr = String(payload.id || payload.order_id || payload.channel_order_id || Date.now());
      const customerEmail = payload.email || payload.customer_email || `guest-${Date.now()}@santharisingh.com`;
      const customerName = payload.customer_name || payload.billing_name || payload.shipping_name || 'Guest Customer';
      const phone = payload.customer_phone || payload.billing_phone || payload.shipping_phone || '';

      const totalAmount = Number(payload.total || payload.total_price || payload.grand_total || 0);
      const paymentMethod = (payload.payment_method || payload.payment_type || 'cod').toLowerCase().includes('cod') ? 'cod' : 'online';
      const paymentStatus = paymentMethod === 'cod' ? 'pending' : 'paid';

      // Find or auto-create User account in MongoDB so customer appears in Admin Customers List
      let user: any = null;
      if (customerEmail) {
        user = await this.usersService.findByEmail(customerEmail);
      }
      if (!user) {
        const dummyPassword = crypto.randomBytes(12).toString('hex');
        user = await this.usersService.create({
          name: customerName,
          email: customerEmail,
          phone: phone,
          password: dummyPassword,
          isActive: true,
        } as any);
        console.log('👤 [AUTO-CREATED CUSTOMER PROFILE]:', user._id.toString(), customerName, customerEmail);
      }

      const items = (payload.line_items || payload.products || payload.items || []).map((it: any) => ({
        product: new Types.ObjectId(),
        name: String(it.name || it.title || 'Ayurvedic Product'),
        price: Number(it.price || 0),
        quantity: Number(it.quantity || 1),
        image: String(it.image || it.image_url || '/images/product.png'),
      }));

      const shippingAddress = {
        fullName: customerName,
        phone: phone,
        addressLine1: String(payload.billing_address || payload.shipping_address || ''),
        addressLine2: String(payload.billing_address_2 || payload.shipping_address_2 || ''),
        city: String(payload.billing_city || payload.shipping_city || ''),
        state: String(payload.billing_state || payload.shipping_state || ''),
        pincode: String(payload.billing_pincode || payload.shipping_pincode || ''),
        country: String(payload.billing_country || payload.shipping_country || 'India'),
      };

      const count = await this.orderModel.countDocuments();
      const nextSeq = 1001 + count;
      const customOrderId = `SHS-${nextSeq}`;

      const newOrder = new this.orderModel({
        id: customOrderId,
        orderNumber: nextSeq,
        user: user ? user._id : null,
        items: items,
        totalAmount: totalAmount,
        shippingCharge: Number(payload.shipping_charges || 0),
        discount: Number(payload.discount_amount || 0),
        status: 'confirmed',
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        shippingAddress: shippingAddress,
        notes: `Order created via Shiprocket Headless Checkout (${orderIdStr})`,
      });

      await newOrder.save();
      console.log('✅ [SHIPROCKET ORDER SYNCED TO MONGODB]:', newOrder._id.toString());
      return { status: 'success', message: 'Order created in database', orderId: newOrder._id.toString(), userId: user?._id?.toString() };
    } catch (err) {
      console.error('❌ Error saving Shiprocket order to MongoDB:', err);
      return { status: 'error', message: err.message };
    }
  }

  async handleOrderUpdate(data: any) {
    console.log('🔄 Shiprocket Order Update Webhook received:', data);
    try {
      const payload = data.order || data.current || data;
      const orderIdStr = String(payload.id || payload.order_id || '');
      if (orderIdStr) {
        const statusMap: any = {
          'DELIVERED': 'delivered',
          'SHIPPED': 'shipped',
          'CANCELED': 'cancelled',
          'CANCELLED': 'cancelled',
        };
        const newStatus = statusMap[String(payload.status || '').toUpperCase()] || 'processing';
        await this.orderModel.updateOne(
          { id: { $regex: new RegExp(orderIdStr, 'i') } },
          { $set: { status: newStatus } }
        );
      }
      return { status: 'success', message: 'Order status updated' };
    } catch (err) {
      console.error('❌ Error updating Shiprocket order:', err);
      return { status: 'error', message: err.message };
    }
  }

  async handleInventorySync(data: any) {
    console.log('📊 Shiprocket Inventory Sync Webhook received:', data);
    return { status: 'success', message: 'Inventory webhook received' };
  }

  /**
   * Shiprocket Headless Checkout Token Generation API
   */
  async createCheckoutToken(items: any[], redirectUrl?: string, cartDiscount?: any, customAttributes?: any) {
    const rawApiKey = this.configService.get<string>('SHIPROCKET_API_KEY') || 'VaWdmURsWCBxqCBA';
    const rawSecretKey = this.configService.get<string>('SHIPROCKET_SECRET_KEY') || 'j2BtH9IQzTg0gHNzxqNnjCFYzsEmBBOF';
    const apiKey = rawApiKey.replace(/^["']|["']$/g, '').trim();
    const secretKey = rawSecretKey.replace(/^["']|["']$/g, '').trim();
    const timestamp = new Date().toISOString();

    const formattedItems = (items || []).map((item) => {
      const rawVariantId = item.variant_id || item.sku || item.id || item._id || '1001';
      const variantId = String(toNumericId(rawVariantId));
      const itemPrice = Number(item.price || 0);
      const itemName = String(item.name || item.title || 'Ayurvedic Product');
      let imageUrl = item.img || item.image || item.image_url || 'https://santharisingh.com/images/product.png';
      if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = `https://santharisingh.com${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
      }

      const itemObj: any = {
        variant_id: variantId,
        quantity: Number(item.quantity || 1),
      };

      if (itemPrice > 0 || itemName) {
        itemObj.catalog_data = {
          price: itemPrice,
          name: itemName,
          image_url: imageUrl,
        };
      }

      return itemObj;
    });

    if (formattedItems.length === 0) {
      formattedItems.push({
        variant_id: '1001',
        quantity: 1,
        catalog_data: {
          price: 100,
          name: 'Ayurvedic Product',
          image_url: 'https://santharisingh.com/images/product.png',
        },
      });
    }

    const cartData: any = {
      items: formattedItems,
      custom_attributes: customAttributes || { source: 'santharisingh_storefront' },
      mobile_app: false,
    };


    const payload = {
      cart_data: cartData,
      redirect_url: redirectUrl || 'https://santharisingh.com/order-confirm',
      timestamp: timestamp,
    };

    const bodyStr = JSON.stringify(payload);
    console.log(bodyStr);
    const hmac = crypto.createHmac('sha256', secretKey).update(bodyStr).digest('base64');

    try {
      const res = await fetch('https://checkout-api.shiprocket.com/api/v1/access-token/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Api-HMAC-SHA256': hmac,
        },
        body: bodyStr,
      });

      const data = await res.json();
      if (data && data.ok && data.result) {
        console.log('🚀 [SHIPROCKET HEADLESS CHECKOUT TOKEN] Generated:', data.result.token);
        return {
          success: true,
          token: data.result.token,
          expires_at: data.result.expires_at,
          order_id: data.result.data?.order_id,
        };
      }
      console.warn('⚠️ [SHIPROCKET HEADLESS TOKEN FAILED]', data);
      return { success: false, error: data.error || 'Could not generate checkout token', data };
    } catch (err) {
      console.error('❌ Shiprocket Headless Token Error:', err);
      throw new BadRequestException('Failed to generate Shiprocket Checkout Token');
    }
  }
}

