import { Schema, Document } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDefined, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { Shape, Interaction, InteractionSchema } from '../shared/models/shared.model';
import { FileModel } from '../infrastructures/infrastructure.model';
import '../shared/models/project.model';
import { Device } from '@aitheon/device-manager-server';


export enum StationType {
  CHARGING = 'CHARGING',
  CHARGING_TRACK = 'CHARGING_TRACK',
  CHARGING_DOCK = 'CHARGING_DOCK',
  WORK = 'WORK',
}

@JSONSchema({ description: 'Station shape model' })
export class StationShape extends Shape {
  @IsNumber()
  rotation: number;
}

@JSONSchema({ description: 'Station model' })
export class Station {

  @IsMongoId()
  @IsOptional()
  _id: any;

  @IsString()
  name: string;

  @IsEnum(StationType)
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

  // Only for frontend
  @IsOptional()
  controller: Device | string;

  @IsOptional()
  system: any;

  @IsOptional()
  @IsNumber()
  payRate: number;

  @IsInt()
  pixelScale: number;

  @Type(() => FileModel)
  @ValidateNested()
  layoutImage: FileModel;

  @Type(() => FileModel)
  @ValidateNested()
  coverImage: FileModel;

  // Only for request from client
  @IsOptional()
  @IsString()
  controllerSerialNumber: string;

  // Only for request from client
  @IsOptional()
  @IsString()
  controllerName: string;

  // Only for request from client
  @IsOptional()
  @IsString()
  parentSystem: string;
}

export const StationShapeSchema = new Schema({
  styling: {
    backgroundColor: String
  },
  polygonPoints: [{
    x: Number,
    y: Number,
    _id: false
  }],
  rotation: {
    type: Number,
    default: 0
  }
});
/**
 * Database schema/collection
 */
const stationSchema = new Schema({
  name: {
    type: String
  },
  type: {
    type: String,
    enum: Object.keys(StationType)
  },
  infrastructure: {
    type: Schema.Types.ObjectId,
    ref: 'Infrastructure'
  },
  floor: {
    type: Schema.Types.ObjectId,
    ref: 'Infrastructure.floors'
  },
  system: {
    type: Schema.Types.ObjectId,
    ref: 'System'
  },
  payRate: {
    type: Number
  },
  layoutImage: {
    _id: Schema.Types.ObjectId,
    name: String,
    signedUrl: String,
    contentType: String
  },
  pixelScale: Number,
  coverImage: {
    _id: Schema.Types.ObjectId,
    name: String,
    signedUrl: String,
    contentType: String
  },
  shape: StationShapeSchema,
  interaction: InteractionSchema
},
  {
    timestamps: true,
    collection: 'smart_infrastructure__stations'
  });

export type IStation = Document & Station;
export const StationSchema = Db.connection.model<IStation>('Station', stationSchema);
