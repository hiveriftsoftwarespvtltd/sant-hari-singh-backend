import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /api/categories — Public
  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  // POST /api/categories/add — Admin
  @Post('add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createDto: any) {
    const saved = await this.categoriesService.create(createDto);
    return { success: true, category: saved };
  }

  // POST /api/categories/:id/update — Admin
  @Post(':id/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: any) {
    const saved = await this.categoriesService.update(id, updateDto);
    return { success: true, category: saved };
  }

  // POST /api/categories/:id/delete — Admin
  @Post(':id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.remove(id);
    return { success: true };
  }

  // POST /api/categories/:id/toggle — Admin
  @Post(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    const saved = await this.categoriesService.toggleStatus(id);
    return { success: true, category: saved };
  }
}
