import { Schema, Document } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDate, IsDefined, IsOptional, Min, IsDateString, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { Item } from '../shared/models/item.model';

export enum InfrastructureType {
  BUILDING = 'BUILDING',
  FACTORY = 'FACTORY',
  WAREHOUSE = 'WAREHOUSE'
}

export enum InfrastructureStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED'
}

export enum FloorStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  DISABLED = 'DISABLED'
}

export enum GraphReferenceType {
  SERVICE = 'SERVICE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  FLOOR = 'FLOOR',
  STATION = 'STATION'
}

@JSONSchema({ description: 'Graph reference model' })
export class GraphReferenceModel {

  @IsMongoId()
  _id: string;

  @IsString()
  name: string;

}

@JSONSchema({ description: 'List graph references' })
export class GraphReference {

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphReferenceModel)
  infrastructures: GraphReferenceModel[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphReferenceModel)
  floors: GraphReferenceModel[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphReferenceModel)
  stations: GraphReferenceModel[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphReferenceModel)
  devices: GraphReferenceModel[];

}

@JSONSchema({ description: 'File schema' })
export class FileModel {

  @IsMongoId()
  _id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contentType: string;

  @IsOptional()
  @IsString()
  signedUrl: string;
}


@JSONSchema({ description: 'Infrastructure location model' })
export class InfrastructureLocation {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  type: string;

  @IsString()
  addressLine1: string;

  @IsString()
  @IsOptional()
  addressLine2: string;

  @IsString()
  @IsOptional()
  regionState: string;

  @IsString()
  city: string;

  @IsNumber()
  code: number;

  @IsString()
  country: string;

}

@JSONSchema({ description: 'Infrastructure floor model' })
export class Floor {

  @IsMongoId()
  @IsOptional()
  _id: any;

  @IsString()
  name: string;

  @IsInt()
  number: number;

  @IsInt()
  pixelScale: number;

  @Type(() => FileModel)
  @ValidateNested()
  uploadedFile: FileModel;

  @IsEnum(FloorStatus)
  status: string;

  @IsDefined()
  system: any;
}

@JSONSchema({ description: 'Infrastructure model' })
export class Infrastructure {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsDefined()
  createdBy: any;

  @IsDefined()
  system: any;

  @IsDefined()
  organization: any;

  @IsDefined()
  location: any;

  @IsEnum(InfrastructureStatus)
  status: InfrastructureStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Floor)
  floors: Floor[];

  @Type(() => FileModel)
  @ValidateNested()
  logo: FileModel;

  @IsOptional()
  items: Item[] | string[];

}


const floorSchema = new Schema({
  name: String,
  number: Number,
  status: {
    type: String,
    enum: Object.keys(FloorStatus),
    default: FloorStatus.PENDING
  },
  system: {
    type: Schema.Types.ObjectId,
    ref: 'System'
  },
  uploadedFile: {
    _id: Schema.Types.ObjectId,
    name: String,
    signedUrl: String,
    contentType: String
  },
  pixelScale: Number
});

/**
 * Database schema/collection
 */
const infrastructureSchema = new Schema({
  name: {
    type: String
  },
  type: {
    type: String,
    enum: Object.keys(InfrastructureType),
    default: InfrastructureType.BUILDING
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  system: {
    type: Schema.Types.ObjectId,
    ref: 'System'
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'Organization.locations'
  },
  status: {
    type: String,
    enum: Object.keys(InfrastructureStatus),
    default: InfrastructureStatus.ACTIVE
  },
  floors: [floorSchema],
  logo: {
    _id: Schema.Types.ObjectId,
    name: String,
    signedUrl: String,
    contentType: String
  },
  items: [{
    type: Schema.Types.ObjectId,
    ref: 'Item'
  }]
},
  {
    timestamps: true,
    collection: 'smart_infrastructure__infrastructures'
  });

export type IInfrastructure = Document & Infrastructure;
export const InfrastructureSchema = Db.connection.model<IInfrastructure>('Infrastructure', infrastructureSchema);
