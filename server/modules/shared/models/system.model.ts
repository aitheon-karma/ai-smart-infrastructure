import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import {
  IsString,
  IsMongoId,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum ReferenceType {
  COMPLEX = 'COMPLEX',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  FLOOR = 'FLOOR',
  STATION = 'STATION',
  ROBOT = 'ROBOT'
}

@JSONSchema({ description: 'System from device manager' })
export class System {
  @IsMongoId()
  _id: string;

  @IsString()
  name: string;

  @IsOptional()
  organization: any;

  @IsOptional()
  parent: any;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType: ReferenceType;

  @IsOptional()
  createdBy: any;

  @IsOptional()
  updatedBy: any;
}

const systemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization'
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'System'
    },
    referenceType: {
      type: String,
      enum: Object.keys(ReferenceType)
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    collection: 'device_manager__systems'
  }
);

export type ISystem = Document & System;

export const SystemSchema = Db.connection.model<ISystem>('System', systemSchema);
