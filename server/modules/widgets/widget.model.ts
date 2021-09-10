/**
 * Module dependencies.
 */
import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDate, IsDefined, IsOptional, Min, IsDateString, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';


@JSONSchema({ description: 'Wiget config' })
export class WidgetConfig {

  @IsNumber()
  @IsOptional()
  cols: number;

  @IsNumber()
  @IsOptional()
  rows: number;


  @IsNumber()
  @IsOptional()
  y: number;

  @IsNumber()
  @IsOptional()
  x: number;

  @IsBoolean()
  @IsOptional()
  dragEnabled: Boolean;

  @IsBoolean()
  @IsOptional()
  resizeEnabled: Boolean;
}


@JSONSchema({ description: 'Widget for smart-infrastructure' })
export class Widget {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  @IsOptional()
  component: string;


  @IsOptional()
  @Type(() => Object)
  data: any;


  @IsMongoId()
  @IsOptional()
  infrastructure: string;


  @IsOptional()
  @IsString()
  previewImage: string;


  @IsOptional()
  @IsString()
  description: string;


  @IsOptional()
  @ValidateNested()
  config: WidgetConfig;

}

/**
 * Widget
 */
const widgetSchema = new Schema({
  name: String,
  component: String,
  infrastructure: String,
  data: {
    type: Schema.Types.Mixed
  },
  previewImage: String,
  description: String,
  config: {
    cols: Number,
    rows: Number,
    y: Number,
    x: Number,
    dragEnabled: Boolean,
    resizeEnabled: Boolean
  }
}, {
    timestamps: true,
    collection: 'smart-infrastructure__widgets'
  });


export type IWidget = Document & Widget;
export const WidgetSchema = Db.connection.model<IWidget>('Widget', widgetSchema);
