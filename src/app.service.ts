import { Injectable, OnModuleInit } from '@nestjs/common';
import { ProductsService } from './modules/products/products.service';
import { CategoriesService } from './modules/categories/categories.service';
import { UsersService } from './modules/users/users.service';
import * as fs from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
  ) { }

  getHello(): string {
    return '🚀 Saint Hari Backend API is running!';
  }

  async onModuleInit() {
    console.log('🔄 Checking database seed data...');
    try {
      await this.productsService.dropIdIndex();
      await this.seedCategories();
      await this.seedProducts();
      await this.seedAdminUser();
      console.log('✅ Database check completed.');
    } catch (err) {
      console.error('❌ Database seeding error:', err);
    }
  }

  private async seedCategories() {
    const list = await this.categoriesService.findAll();
    if (list.length > 0) return;

    console.log('🌱 Seeding Categories...');
    const path = join(process.cwd(), '../newsanthari/categories.json');
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      for (const cat of data) {
        await this.categoriesService.create({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          emoji: cat.emoji,
          img: cat.img,
          enabled: cat.enabled,
          count: cat.count,
        });
      }
      console.log(`✅ Successfully seeded ${data.length} categories.`);
    } else {
      console.log('⚠️ categories.json file not found at: ' + path);
    }
  }

  private async seedProducts() {
    const list = await this.productsService.findAllAdmin();
    if (list.length > 0) return;

    console.log('🌱 Seeding Products...');
    const path = join(process.cwd(), '../newsanthari/products.json');
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      for (const prod of data) {
        const tags = prod.tags ? (Array.isArray(prod.tags) ? prod.tags : [prod.tags]) : [];
        await this.productsService.create({
          name: prod.name,
          sku: prod.sku || '',
          brand: prod.brand || 'SANT HARI SINGH',
          slug: prod.slug || '',
          subtitle: prod.subtitle || '',
          description: prod.description || '',
          price: prod.price,
          originalPrice: prod.originalPrice || 0,
          discount: prod.discount || 0,
          stock: prod.stock || 50,
          images: prod.imgs || [prod.img],
          img: prod.img || '',
          imgs: prod.imgs || [],
          category: prod.category,
          section: prod.section || '',
          status: prod.status || 'active',
          isActive: prod.status !== 'inactive',
          isFeatured: prod.isFeatured || false,
          isNew: prod.isNew || false,
          isBestseller: prod.isBestseller || false,
          rating: prod.rating || 5.0,
          reviews: prod.reviews || 0,
          sizes: prod.sizes || ['Standard'],
          selectedSize: prod.selectedSize || 'Standard',
          variants: prod.variants || [],
          tags: tags,
          seo: prod.seo || null,
        } as any);
      }
      console.log(`✅ Successfully seeded ${data.length} products.`);
    } else {
      console.log('⚠️ products.json file not found at: ' + path);
    }
  }

  private async seedAdminUser() {
    const email = process.env.ADMIN_EMAIL || 'admin@santharising.com';
    const rawPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let adminUser = await this.usersService.findByEmail(email);
    if (!adminUser) {
      console.log(`🌱 Seeding Admin User: ${email}...`);
      const hashedPassword = await bcrypt.hash(rawPassword, 12);
      await this.usersService.create({
        name: 'Sant Hari Singh Admin',
        email: email,
        password: hashedPassword,
        role: 'admin' as any,
        isActive: true,
      } as any);
      console.log(`✅ Admin user created successfully: ${email}`);
    } else {
      console.log(`🌱 Updating admin user credentials in database: ${email}...`);
      const hashedPassword = await bcrypt.hash(rawPassword, 12);
      await this.usersService.update(adminUser._id.toString(), {
        role: 'admin' as any,
        isActive: true,
        password: hashedPassword,
      } as any);
      console.log(`✅ Admin user credentials updated to match .env: ${email}`);
    }
  }
}
