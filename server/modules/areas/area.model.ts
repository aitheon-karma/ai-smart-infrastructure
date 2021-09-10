import { Schema, Document } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDate, IsDefined, IsOptional, Min, IsDateString, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Shape, Interaction, ShapeSchema, InteractionSchema } from '../shared/models/shared.model';


export enum AreaType {
  RESTRICTED = 'RESTRICTED',
  TARGET = 'TARGET',
  INITIALIZATION = 'INITIALIZATION'
}

@JSONSchema({ description: 'Area model' })
export class Area {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  name: string;

  @IsEnum(AreaType)
  type: string;

  @IsDefined()
  infrastructure: any;

  @IsDefined()
  floor: any;

  @ValidateNested()
  @Type(() => Shape)
  shape: Shape;

  @ValidateNested()
  @Type(() => Interaction)
  interaction: Interaction;

}


/**
 * Database schema/collection
 */
const areaSchema = new Schema({
  name: {
    type: String
  },
  type: {
    type: String,
    enum: Object.keys(AreaType)
  },
  infrastructure: {
    type: Schema.Types.ObjectId,
    ref: 'Infrastructure'
  },
  floor: {
    type: Schema.Types.ObjectId,
    ref: 'Infrastructure.floors'
  },
  shape: ShapeSchema,
  interaction: InteractionSchema
},
  {
    timestamps: true,
    collection: 'smart_infrastructure__areas'
  });

export type IArea = Document & Area;
export const AreaSchema = Db.connection.model<IArea>('Area', areaSchema);
