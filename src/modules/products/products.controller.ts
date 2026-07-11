import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private mapProduct(p: any) {
    const isAct = p.isActive !== false && p.status !== 'inactive';
    const originalPriceVal = p.originalPrice || p.price || 0;
    const discountVal = p.discount || (originalPriceVal - p.price > 0 ? Math.round(((originalPriceVal - p.price) / originalPriceVal) * 100) : 0);
    const skuVal = p.sku || `SHS-${Math.floor(1000 + Math.random() * 9000)}`;
    const slugVal = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const imgVal = p.img || (p.images && p.images.length > 0 ? p.images[0] : 'images/product.png');
    const imgsVal = p.imgs && p.imgs.length > 0 ? p.imgs : (p.images && p.images.length > 0 ? p.images : ['images/product.png']);

    return {
      id: p._id.toString(),
      _id: p._id.toString(),
      name: p.name,
      sku: skuVal,
      brand: p.brand || 'SANT HARI SINGH',
      slug: slugVal,
      subtitle: p.subtitle || '',
      category: p.category,
      price: p.price,
      originalPrice: originalPriceVal,
      discount: discountVal,
      stock: p.stock,
      rating: p.rating || 5.0,
      reviews: p.reviews || p.reviewCount || 0,
      isFeatured: p.isFeatured || false,
      isNew: p.isNew || false,
      isBestseller: p.isBestseller || false,
      img: imgVal,
      imgs: imgsVal,
      description: p.description || '',
      shortDescription: p.shortDescription || '',
      status: isAct ? 'active' : 'inactive',
      isActive: isAct,
      section: p.section || '',
      subCategory: p.subCategory || '',
      sizes: p.sizes && p.sizes.length > 0 ? p.sizes : ['Standard'],
      selectedSize: p.selectedSize || 'Standard',
      variants: p.variants && p.variants.length > 0 ? p.variants : [{ size: 'Standard', price: p.price, stock: p.stock, sku: skuVal }],
      tags: p.tags || [],
      seo: p.seo || {
        title: `${p.name} | Sant Hari Singh`,
        description: `Buy ${p.name} online.`,
        keywords: [p.name.toLowerCase()],
        slug: slugVal,
        ogImage: imgVal
      }
    };
  }

  // GET /api/products — Public with filters
  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
  ) {
    const res = await this.productsService.findAll({
      category,
      search,
      minPrice,
      maxPrice,
      page,
      limit,
      sort,
    });

    if (Array.isArray(res)) {
      return res.map(p => this.mapProduct(p));
    } else {
      return {
        ...res,
        products: res.products.map(p => this.mapProduct(p))
      };
    }
  }

  // GET /api/products/admin — Admin: get all including inactive
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllAdmin() {
    const list = await this.productsService.findAllAdmin();
    return list.map(p => this.mapProduct(p));
  }

  // GET /api/products/:id — Public
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const p = await this.productsService.findById(id);
    return this.mapProduct(p);
  }

  // POST /api/products — Admin only
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() body: any) {
    // Map status to isActive
    if (body.status !== undefined) {
      body.isActive = body.status === 'active';
    }
    const p = await this.productsService.create(body);
    return this.mapProduct(p);
  }

  // POST /api/products/add — Admin only alias
  @Post('add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createAlias(@Body() body: any) {
    if (body.status !== undefined) {
      body.isActive = body.status === 'active';
    }
    const p = await this.productsService.create(body);
    return this.mapProduct(p);
  }

  // PUT /api/products/:id — Admin only
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (body.status !== undefined) {
      body.isActive = body.status === 'active';
    }
    const p = await this.productsService.update(id, body);
    return this.mapProduct(p);
  }

  // POST /api/products/update — Admin only alias
  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateAlias(@Body() body: any) {
    const id = body.id || body._id;
    if (!id) throw new BadRequestException('Product ID is required');
    if (body.status !== undefined) {
      body.isActive = body.status === 'active';
    }
    const p = await this.productsService.update(id, body);
    return this.mapProduct(p);
  }

  // DELETE /api/products/:id — Admin only
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // POST /api/products/delete — Admin only alias
  @Post('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeAlias(@Body() body: { id?: string; _id?: string }) {
    const id = body.id || body._id;
    if (!id) throw new BadRequestException('Product ID is required');
    return this.productsService.remove(id);
  }
}
