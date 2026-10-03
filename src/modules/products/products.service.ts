import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async dropIdIndex() {
    try {
      await this.productModel.collection.dropIndex('id_1');
      console.log('✅ Dropped unique index id_1 from products collection.');
    } catch (err) {
      console.log('ℹ️ id_1 index drop skipped or already dropped.');
    }
  }

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const rawDto = createProductDto as any;
    if (!rawDto.slug || rawDto.slug.trim() === '') {
      rawDto.slug = slugify(rawDto.name);
    }
    let baseSlug = rawDto.slug;
    let suffix = 1;
    while (await this.productModel.findOne({ slug: rawDto.slug }).exec()) {
      rawDto.slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
    const product = new this.productModel(rawDto);
    return product.save();
  }

  async findAll(query: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      page,
      limit,
      sort = '-createdAt',
    } = query;

    const filter: any = { isActive: true };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    // If page and limit are not provided, return flat array to match frontend expectations
    if (page === undefined && limit === undefined) {
      return this.productModel.find(filter).sort(sort).exec();
    }

    const currentPage = page || 1;
    const currentLimit = limit || 12;
    const skip = (currentPage - 1) * currentLimit;
    const [products, total] = await Promise.all([
      this.productModel.find(filter).sort(sort).skip(skip).limit(currentLimit).exec(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      products,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / currentLimit),
    };
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    const rawDto = updateProductDto as any;
    if (rawDto.name && (!rawDto.slug || rawDto.slug.trim() === '')) {
      rawDto.slug = slugify(rawDto.name);
    }
    if (rawDto.slug) {
      let baseSlug = rawDto.slug;
      let suffix = 1;
      while (await this.productModel.findOne({ slug: rawDto.slug, _id: { $ne: id } }).exec()) {
        rawDto.slug = `${baseSlug}-${suffix}`;
        suffix++;
      }
    }
    const product = await this.productModel
      .findByIdAndUpdate(id, rawDto, { new: true })
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string): Promise<{ message: string }> {
    let product: any = null;
    if (isValidObjectId(id)) {
      product = await this.productModel.findByIdAndDelete(id).exec();
    }
    if (!product) {
      product = await this.productModel.findOneAndDelete({
        $or: [{ id: id }, { slug: id }]
      }).exec();
    }
    if (!product) throw new NotFoundException('Product not found');
    return { message: 'Product deleted successfully' };
  }

  async findAllAdmin() {
    return this.productModel.find().sort('-createdAt').exec();
  }
}
