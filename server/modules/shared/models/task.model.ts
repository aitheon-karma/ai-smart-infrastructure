import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsBoolean, IsNotEmpty, IsArray, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDefined, IsOptional, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum TaskType {
  TASK = 'TASK',

  ISSUE = 'ISSUE',
  STORY = 'STORY',
  MILESTONE = 'MILESTONE',
  EVENT = 'EVENT',
  NOTIFICATION = 'NOTIFICATION',
  EPIC = 'EPIC',
  TICKET = 'TICKET',
  SALES = 'SALES'
}

export enum TaskSubtype {
  BUG = 'BUG',
  ISSUE = 'ISSUE',
  ERROR = 'ERROR',
  FEATURE_REQUEST = 'FEATURE_REQUEST'
}

@JSONSchema({ description: 'Algorithm schema' })
export class Algorithm {

  @IsNumber()
  demand: number;
}

@JSONSchema({ description: 'Action schema' })
export class Action {
  @IsString()
  name: string;
  @IsString()
  redirect: string;
  @IsString()
  referenceId: string;
  @IsOptional()
  @Type(() => Object)
  data: any;
}

@JSONSchema({ description: 'User Profile schema' })
export class UserProfile {
  @IsString()
  firstName: string;
  @IsString()
  lastName: string;
}

@JSONSchema({ description: 'User schema' })
export class User {
  @IsMongoId()
  _id: string;
  @ValidateNested()
  profile: UserProfile;
}

@JSONSchema({ description: 'Estimated hours' })
export class EstimatedHours {
  @IsNumber()
  min: number;
  @IsNumber()
  max: number;
}

@JSONSchema({ description: 'Time logged to tracker, with total time in seconds' })
export class LoggedTime {
  @IsDateString()
  startTime: Date;
  @IsOptional()
  @IsDateString()
  endTime?: Date;
  @IsOptional()
  @IsNumber()
  totalTime?: number;
  @IsMongoId()
  user: any;
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

@JSONSchema({ description: 'Expected time to complete the task in days' })
export class EstimatedCompletion {
  @IsNumber()
  soonestDays: number;
  @IsNumber()
  latestDays: number;
  @IsNumber()
  projectedDays: number;
}

@JSONSchema({ description: 'Task model' })
export class Task {

  @IsMongoId()
  _id: string;
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsNumber()
  orderIndex: number;
  @IsNumber()
  priority: number;
  @IsString()
  state: string;
  @IsEnum(TaskType)
  type: TaskType;
  @IsEnum(TaskSubtype)
  subtype: TaskSubtype;
  @IsBoolean()
  recurring: boolean;
  @IsBoolean()
  addToCalendar: boolean;
  @ValidateNested()
  createdBy: User;
  @IsOptional()
  @Type(() => Object)
  project: any;
  @IsOptional()
  @Type(() => Object)
  parentTask: any;
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  assigned: any[];
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  @IsOptional()
  @Type(() => Object)
  assignedToDevice: any;
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  dismissed: any[];
  @IsString()
  service: string;
  @IsOptional()
  @Type(() => Object)
  organization: any;
  @ValidateNested({ each: true })
  @Type(() => FileModel)
  files: FileModel[];
  @ValidateNested()
  estimatedHours: EstimatedHours;
  @IsOptional()
  @Type(() => Object)
  startDate: Date;
  @IsOptional()
  @Type(() => Object)
  finishDate: Date;
  @IsDateString()
  createdAt: Date;
  @IsDateString()
  updatedAt: Date;
  @IsNumber()
  remainingHours: number;
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  dependencies: any[];
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  dependents: any[];
  @ValidateNested({ each: true })
  @Type(() => LoggedTime)
  loggedTime: LoggedTime[];
  @ValidateNested()
  estimatedCompletionDays: EstimatedCompletion;
  @ValidateNested()
  action: Action;

  @IsBoolean()
  read: boolean;

  @IsBoolean()
  isNotify: boolean;

  @IsDateString()
  notifyDate: Date;

  @IsOptional()
  assignedToSystem: any;
  @IsString()
  data: string;
  // To link task with board
  @IsOptional()
  @IsString()
  board: string;

  // Unique identification for task
  @IsOptional()
  @IsString()
  taskPrefix: string;

  // Labels for task i.e [Rush, Important etc]
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  labels: any[];

  // Board stages to identify in which stage task exists
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  stages: any[];
  // Comments on task
  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  comments: any[];

  @IsOptional()
  @Type(() => Algorithm)
  algorithmic: Algorithm;
}

/**
 * Database schema/collection
 */
const taskSchema = new Schema({
  name: String,
  description: String,
  orderIndex: Number,
  priority: Number,
  state: String,
  type: {
    type: String,
    enum: Object.keys(TaskType)
  },
  subtype: {
    type: String,
    enum: Object.keys(TaskSubtype)
  },
  recurring: Boolean,
  addToCalendar: Boolean,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  parentTask: {
    type: Schema.Types.ObjectId,
    ref: 'Task'
  },
  assigned: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedToDevice: {
    type: Schema.Types.ObjectId,
    ref: 'Device'
  },
  dismissed: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  service: {
    type: String,
    ref: 'Service'
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  files: [{
    _id: Schema.Types.ObjectId,
    name: String,
    signedUrl: String,
    contentType: String
  }],
  estimateHours: {
    min: Number,
    max: Number
  },
  startDate: Date,
  finishDate: Date,
  remainingHours: Number,
  dependencies: [{
    dependencyType: String,
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task'
    }
  }],
  dependents: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  loggedTime: [{
    startTime: Date,
    endTime: Date,
    totalTime: Number,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
  }],
  estimatedCompletionDays: {
    soonestDays: Number,
    latestDays: Number,
    projectedDays: Number
  },
  action: {
    name: String,
    redirect: String,
    referenceId: String,
    data: Schema.Types.Mixed,
  },
  read: {
    type: Boolean,
    default: false
  },
  isNotify: {
    type: Boolean,
    default: false
  },
  notifyDate: {
    type: Date,
    default: Date.now
  },
  assignedToSystem: {
    type: Schema.Types.ObjectId,
    ref: 'System'
  },
  data: {
    type: Schema.Types.ObjectId,
    ref: 'Deal'
  },
  algorithmic: {
    demand: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      default: 0
    }
  }
},
  {
    timestamps: true,
    collection: 'orchestrator__tasks'
  });

export type ITask = Document & Task;
export const TaskSchema = Db.connection.model<ITask>('Task', taskSchema);
