import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RawHerbSubCategoriesService } from './raw-herb-subcategories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('raw-herb-subcategories')
export class RawHerbSubCategoriesController {
  constructor(private readonly service: RawHerbSubCategoriesService) {}

  // GET /api/raw-herb-subcategories — Public
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  // POST /api/raw-herb-subcategories/add — Admin
  @Post('add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: any) {
    const saved = await this.service.create(dto);
    return { success: true, subCategory: saved };
  }

  // POST /api/raw-herb-subcategories/:id/update — Admin
  @Post(':id/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: any) {
    const saved = await this.service.update(id, dto);
    return { success: true, subCategory: saved };
  }

  // POST /api/raw-herb-subcategories/:id/delete — Admin
  @Post(':id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }

  // POST /api/raw-herb-subcategories/:id/toggle — Admin
  @Post(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggle(@Param('id') id: string) {
    const saved = await this.service.toggleStatus(id);
    return { success: true, subCategory: saved };
  }
}
