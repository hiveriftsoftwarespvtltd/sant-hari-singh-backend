import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';

@Injectable()
export class ShiprocketService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  /**
   * Helper to format a single product to Shiprocket SRC format
   */
  private formatProduct(product: any, baseUrl: string) {
    const productId = String(product._id || product.id || '');
    const productPrice = String(product.price || 0);
    const compareAtPrice = product.originalPrice ? String(product.originalPrice) : null;
    const quantity = typeof product.stock === 'number' ? product.stock : 100;
    const sku = product.sku || `SKU-${productId.slice(-6).toUpperCase()}`;
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

    const formattedImages = uniqueImages.map((imgSrc, index) => {
      let fullUrl = imgSrc;
      if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://')) {
        const cleanPath = imgSrc.startsWith('/') ? imgSrc : `/${imgSrc}`;
        fullUrl = `${baseUrl}${cleanPath}`;
      }
      return {
        id: String(index + 1),
        product_id: productId,
        src: fullUrl,
        position: index + 1,
        updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    // Handle variants
    let variants: any[] = [];
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      variants = product.variants.map((v: any, idx: number) => ({
        id: String(v._id || v.id || `${productId}_v${idx + 1}`),
        product_id: productId,
        title: v.title || v.name || v.size || `Variant ${idx + 1}`,
        price: String(v.price || productPrice),
        sku: v.sku || `${sku}-${idx + 1}`,
        position: idx + 1,
        inventory_policy: 'deny',
        compare_at_price: v.originalPrice ? String(v.originalPrice) : compareAtPrice,
        fulfillment_service: 'manual',
        inventory_management: 'shiprocket',
        option1: v.size || v.title || 'Default Title',
        option2: null,
        option3: null,
        created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
        updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
        taxable: false,
        barcode: v.barcode || '',
        grams: v.grams || (v.weight ? Number(v.weight) * 1000 : 500),
        image_id: null,
        weight: v.weight ? Number(v.weight) : 0.5,
        weight_unit: 'kg',
        inventory_item_id: idx + 1,
        quantity: typeof v.stock === 'number' ? v.stock : quantity,
        inventory_quantity: typeof v.stock === 'number' ? v.stock : quantity,
        old_inventory_quantity: typeof v.stock === 'number' ? v.stock : quantity,
        requires_shipping: true,
      }));
    } else {
      variants = [
        {
          id: `${productId}_v1`,
          product_id: productId,
          title: 'Default Title',
          price: productPrice,
          sku: sku,
          position: 1,
          inventory_policy: 'deny',
          compare_at_price: compareAtPrice,
          fulfillment_service: 'manual',
          inventory_management: 'shiprocket',
          option1: 'Default Title',
          option2: null,
          option3: null,
          created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
          updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
          taxable: false,
          barcode: '',
          grams: 500,
          image_id: null,
          weight: 0.5,
          weight_unit: 'kg',
          inventory_item_id: 1,
          quantity: quantity,
          inventory_quantity: quantity,
          old_inventory_quantity: quantity,
          requires_shipping: true,
        },
      ];
    }

    const options = [
      {
        id: '1',
        product_id: productId,
        name: 'Title',
        position: 1,
        values: variants.map((v: any) => v.title),
      },
    ];

    return {
      id: productId,
      title: title,
      body_html: `<p>${description}</p>`,
      vendor: product.brand || 'Sant Hari Singh',
      product_type: product.category || 'Ayurvedic',
      created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
      handle: handle,
      updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
      status: product.isActive !== false ? 'active' : 'draft',
      tags: Array.isArray(product.tags) && product.tags.length > 0
        ? product.tags.join(', ')
        : (product.category || 'Ayurveda'),
      images: formattedImages,
      variants: variants,
      options: options,
    };
  }

  /**
   * GET /shiprocket/products?page=1&limit=100 OR ?collection_id=1234&page=1&limit=100
   */
  async getProducts(collectionId?: string, pageParam: number = 1, limitParam: number = 100, hostHeader?: string) {
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(250, Math.max(1, Number(limitParam) || 100));
    const skip = (page - 1) * limit;

    const filter: any = { isActive: true };

    if (collectionId && collectionId.trim() !== '') {
      filter.$or = [
        { category: collectionId },
        { subCategory: collectionId },
        { slug: collectionId },
      ];
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
   * GET /shiprocket/collections?page=1&limit=100
   */
  async getCollections(pageParam: number = 1, limitParam: number = 100) {
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(250, Math.max(1, Number(limitParam) || 100));
    const skip = (page - 1) * limit;

    const [dbCategories, total] = await Promise.all([
      this.categoryModel.find({ enabled: { $ne: false } }).skip(skip).limit(limit).exec(),
      this.categoryModel.countDocuments({ enabled: { $ne: false } }),
    ]);

    // Format categories as Shiprocket collections
    const collections = dbCategories.map((cat) => {
      const catId = String(cat._id || cat.id || cat.slug || '');
      return {
        id: cat.slug || catId,
        title: cat.name || 'Category',
        handle: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
        updated_at: (cat as any).updatedAt ? new Date((cat as any).updatedAt).toISOString() : new Date().toISOString(),
        body_html: `<p>${cat.name || ''}</p>`,
        published_at: (cat as any).createdAt ? new Date((cat as any).createdAt).toISOString() : new Date().toISOString(),
        sort_order: 'best-selling',
        template_suffix: null,
        disjunctive: false,
        rules: [],
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
    console.log('📦 Shiprocket Order Sync Webhook received:', data);
    return { status: 'success', message: 'Order webhook received' };
  }

  async handleOrderUpdate(data: any) {
    console.log('🔄 Shiprocket Order Update Webhook received:', data);
    return { status: 'success', message: 'Order update webhook received' };
  }

  async handleInventorySync(data: any) {
    console.log('📊 Shiprocket Inventory Sync Webhook received:', data);
    return { status: 'success', message: 'Inventory webhook received' };
  }
}
