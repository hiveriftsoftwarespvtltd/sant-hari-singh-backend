import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiprocketController } from './shiprocket.controller';
import { ShiprocketService } from './shiprocket.service';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [ShiprocketController],
  providers: [ShiprocketService],
  exports: [ShiprocketService],
})
export class ShiprocketModule {}
