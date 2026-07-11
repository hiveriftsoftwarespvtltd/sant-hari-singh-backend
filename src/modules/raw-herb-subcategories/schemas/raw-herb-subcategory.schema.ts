import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type RawHerbSubCategoryDocument = RawHerbSubCategory & Document;

@Schema({ timestamps: true })
export class RawHerbSubCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: true })
  enabled: boolean;
}

export const RawHerbSubCategorySchema = SchemaFactory.createForClass(RawHerbSubCategory);
