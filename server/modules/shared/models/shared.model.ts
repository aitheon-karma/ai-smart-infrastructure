import { Schema, Document } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDate, IsDefined, IsOptional, Min, IsDateString, IsArray, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';


export enum WaitPeriod {
  NONE = 'NONE',
  INFINITE = 'INFINITE',
  INTERVAL = 'INTERVAL'
}

export enum RouteType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT'
}

@JSONSchema({ description: 'Styling model' })
export class Styling {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsOptional()
  @IsString()
  backgroundColor: string;

}

@JSONSchema({ description: 'Rotation model' })
export class Rotation {

  @IsInt()
  x: number;

  @IsInt()
  y: number;

  @IsInt()
  z: number;

  @IsInt()
  w: number;

}


@JSONSchema({ description: 'Translation model' })
export class Translation {

  @IsInt()
  x: number;

  @IsInt()
  y: number;

}

@JSONSchema({ description: 'Pose model' })
export class Pose {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @ValidateNested()
  @Type(() => Rotation)
  rotation: Rotation;

  @ValidateNested()
  @Type(() => Translation)
  translation: Translation;

}

@JSONSchema({ description: 'Shape model' })
export class Shape {

  @IsOptional()
  @ValidateNested()
  @Type(() => Styling)
  styling: Styling;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Translation)
  polygonPoints: Translation[];

}

@JSONSchema({ description: 'Interaction model' })
export class Interaction {

  @ValidateNested()
  @Type(() => Pose)
  originPose: Pose;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Route)
  routes: Route[];

}


@JSONSchema({ description: 'Wait information data model' })
export class WaitInfo {

  @IsEnum(WaitPeriod)
  waitPeriod: string;

  @IsOptional()
  @IsInt()
  intervalMilliseconds: number;

}

@JSONSchema({ description: 'Route point model' })
export class RoutePoint {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsBoolean()
  usePreviousRotation: boolean;

  @ValidateNested()
  @Type(() => Pose)
  pose: Pose;

  @IsOptional()
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => String)
  ncCommands: string[];

  @ValidateNested()
  @Type(() => WaitInfo)
  waitInfo: WaitInfo;

}


@JSONSchema({ description: 'Route for model' })
export class Route {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsEnum(RouteType)
  type: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePoint)
  points: RoutePoint[];

}

export const ShapeSchema = new Schema({
  styling: {
    backgroundColor: String
  },
  polygonPoints: [{
    x: Number,
    y: Number,
    _id: false
  }]
});

export const PoseSchema = new Schema({
  rotation: {
    x: Number,
    y: Number,
    z: Number,
    w: Number,
  },
  translation: {
    x: Number,
    y: Number
  }
});

export const RouteSchema = new Schema({
  type: {
    type: String,
    enum: Object.keys(RouteType)
  },
  points: [{
    ncCommands: [String],
    waitInfo: {
      waitPeriod: {
        type: String,
        enum: Object.keys(WaitPeriod),
        default: WaitPeriod.NONE
      },
      intervalMilliseconds: {
        type: Number,
        default: 0
      }
    },
    usePreviousRotation: {
      type: Boolean,
      default: true
    },
    pose: PoseSchema
  }]
});

export const InteractionSchema = new Schema({
  originPose: PoseSchema,
  routes: [RouteSchema]
}, { _id: false});
