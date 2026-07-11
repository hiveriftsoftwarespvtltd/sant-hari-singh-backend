import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().sort({ id: 1 }).exec();
  }

  async findOne(id: number): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ id }).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(createDto: Partial<Category>): Promise<CategoryDocument> {
    const existing = await this.categoryModel.findOne({ slug: createDto.slug }).exec();
    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    // Auto-generate numeric id if not provided
    if (createDto.id === undefined || createDto.id === null) {
      const highest = await this.categoryModel.findOne().sort({ id: -1 }).exec();
      createDto.id = highest ? highest.id + 1 : 1;
    }

    const category = new this.categoryModel(createDto);
    return category.save();
  }

  async update(id: number, updateDto: Partial<Category>): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOneAndUpdate({ id }, updateDto, { new: true }).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(id: number): Promise<{ message: string }> {
    const category = await this.categoryModel.findOneAndDelete({ id }).exec();
    if (!category) throw new NotFoundException('Category not found');
    return { message: 'Category deleted successfully' };
  }

  async toggleStatus(id: number): Promise<CategoryDocument> {
    const category = await this.findOne(id);
    category.enabled = !category.enabled;
    return category.save();
  }
}
