import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';

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
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  /**
   * Helper to format a single product to Shiprocket SRC format matching exact target schema
   */
  private formatProduct(product: any, baseUrl: string) {
    const numericProductId = toNumericId(product.id || product._id);
    const productPrice = String(product.price || 0);
    const compareAtPrice = product.originalPrice ? String(product.originalPrice) : null;
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

    const formattedImages = uniqueImages.map((imgSrc, index) => {
      let fullUrl = imgSrc;
      if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://')) {
        const cleanPath = imgSrc.startsWith('/') ? imgSrc : `/${imgSrc}`;
        fullUrl = `${baseUrl}${cleanPath}`;
      }
      return {
        id: index + 1,
        product_id: numericProductId,
        src: fullUrl,
        position: index + 1,
        updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    // Handle variants according to exact example structure
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
          quantity: typeof v.stock === 'number' ? v.stock : quantity,
          created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
          updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
          taxable: true,
          option_values: {
            Title: varTitle,
          },
          grams: v.grams || (v.weight ? Number(v.weight) * 1000 : 500),
          image: {
            src: variantImgSrc,
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
          quantity: quantity,
          created_at: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
          updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
          taxable: true,
          option_values: {
            Title: 'Standard',
          },
          grams: 500,
          image: {
            src: mainImageSrc,
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
      image: {
        src: mainImageSrc,
      },
      images: formattedImages,
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

    // Format categories as Shiprocket collections with numeric IDs
    const collections = dbCategories.map((cat) => {
      const numericCatId = toNumericId(cat.id || (cat as any)._id || cat.slug);
      return {
        id: numericCatId,
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
