import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RawHerbSubCategoriesController } from './raw-herb-subcategories.controller';
import { RawHerbSubCategoriesService } from './raw-herb-subcategories.service';
import { RawHerbSubCategory, RawHerbSubCategorySchema } from './schemas/raw-herb-subcategory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RawHerbSubCategory.name, schema: RawHerbSubCategorySchema },
    ]),
  ],
  controllers: [RawHerbSubCategoriesController],
  providers: [RawHerbSubCategoriesService],
  exports: [RawHerbSubCategoriesService],
})
export class RawHerbSubCategoriesModule {}
