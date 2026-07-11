import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RawHerbSubCategory, RawHerbSubCategoryDocument } from "./schemas/raw-herb-subcategory.schema";

@Injectable()
export class RawHerbSubCategoriesService implements OnModuleInit {
  constructor(
    @InjectModel(RawHerbSubCategory.name)
    private readonly model: Model<RawHerbSubCategoryDocument>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async findAll(): Promise<any[]> {
    const items = await this.model.find({}).lean();
    return items.map((i: any) => ({
      id: i._id.toString(),
      name: i.name,
      slug: i.slug,
      enabled: i.enabled,
    }));
  }

  async create(dto: any): Promise<any> {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const item = new this.model({ name: dto.name, slug, enabled: true });
    const saved = await item.save();
    return { id: (saved as any)._id.toString(), name: saved.name, slug: saved.slug, enabled: saved.enabled };
  }

  async update(id: string, dto: any): Promise<any> {
    const item: any = await this.model.findByIdAndUpdate(id, { name: dto.name, slug: dto.slug }, { new: true }).lean();
    if (!item) throw new Error("Sub-category not found");
    return { id: item._id.toString(), name: item.name, slug: item.slug, enabled: item.enabled };
  }

  async remove(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async toggleStatus(id: string): Promise<any> {
    const item = await this.model.findById(id);
    if (!item) throw new Error("Sub-category not found");
    item.enabled = !item.enabled;
    await item.save();
    return { id: (item as any)._id.toString(), name: item.name, slug: item.slug, enabled: item.enabled };
  }

  private async seed(): Promise<void> {
    const defaults = [
      { name: "Roots", slug: "roots" },
      { name: "Barks", slug: "barks" },
      { name: "Leaves", slug: "leaves" },
      { name: "Seeds", slug: "seeds" },
      { name: "Flowers", slug: "flowers" },
      { name: "Fruits", slug: "fruits" },
    ];
    for (const d of defaults) {
      const exists = await this.model.findOne({ slug: d.slug });
      if (!exists) {
        await this.model.create({ name: d.name, slug: d.slug, enabled: true });
      }
    }
  }
}
