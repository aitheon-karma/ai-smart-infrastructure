import { Schema, Document } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { Organization } from '@aitheon/core-server';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsEnum, IsNumber, ValidateNested, IsMongoId, IsOptional, IsDateString, IsBoolean, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectType {
  COMPUTE_NODE = 'COMPUTE_NODE',
  DEVICE_NODE = 'DEVICE_NODE',
  SERVICE = 'SERVICE',
  INTERFACE = 'INTERFACE',
  DIGIBOT = 'DIGIBOT',
  LIBRARY = 'LIBRARY',
  APP = 'APP',
  ROBOT = 'ROBOT'
}

export enum ProjectSubType {
  APPLICATION = 'APPLICATION',
  DASHBOARD = 'DASHBOARD',
  AUTOMATION = 'AUTOMATION'
}

export enum ProjectLanguage {
  BLOCK = 'BLOCK',
  TYPESCRIPT = 'TYPESCRIPT',
  PYTHON = 'PYTHON',
  C = 'C',
  CPP = 'CPP'
}

export enum Runtime {
  AOS = 'AOS',
  AOS_EMBEDDED = 'AOS_EMBEDDED',
  AOS_CLOUD = 'AOS_CLOUD'
}


export type GroupSchemas = {
  group: SocketGroup;
  schemas: any[];
};

export class SocketGroup {
  _id: string;
  name: string;
  description: string;
  color: string;
  runtimes: string[];
  version: number;
}


// metadata about the project
export class ProjectMeta {
  initiatorService?: string;
  infrastructureId?: string;
  stationId?: string;
}



@JSONSchema({ description: 'ProjectDependency' })
export class ProjectDependency {

  @IsString()
  version: string;

  @IsString()
  project: string;

}

@JSONSchema({ description: 'Project' })
export class Project {

  @IsMongoId()
  _id: string;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;


  @IsEnum(ProjectSubType)
  projectSubType: ProjectSubType;

  @IsEnum(Runtime)
  runtime: Runtime;

  @IsString()
  summary: string;

  @IsString()
  user: string;

  @IsString()
  organization: string | Organization;

  @IsEnum(ProjectLanguage)
  language: ProjectLanguage;

  @IsDateString()
  lastOpened: Date;

  @IsBoolean()
  archived: boolean;

  @IsDateString()
  @IsOptional()
  createdAt: Date;

  @IsDateString()
  @IsOptional()
  updatedAt: Date;

  @ValidateNested({ each: true })
  @Type(() => ProjectDependency)
  dependencies: ProjectDependency[];

  @ValidateNested({ each: true })
  @Type(() => String)
  @ArrayUnique()
  socketGroups: string[];

  @IsNumber()
  repositoryId: Number;

  generatedSocketGroups: string;

  @IsString()
  @IsOptional()
  @Type(() => ProjectMeta)
  meta: ProjectMeta;
}

/**
 * Database schema/collection
 */
const projectSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxlength: 512
  },
  slug: {
    type: String,
    required: true,
    maxlength: 512
  },
  summary: {
    type: String,
    maxlength: 2048
  },
  projectType: {
    type: String,
    enum: Object.keys(ProjectType)
  },
  projectSubType: {
    type: String,
    enum: Object.keys(ProjectSubType),
    default: ProjectSubType.APPLICATION
  },
  runtime: {
    type: String,
    enum: Object.keys(Runtime)
  },
  language: {
    type: String,
    // tslint:disable-next-line:no-null-keyword
    enum: Object.keys(ProjectLanguage).concat([null])
  },
  lastOpened: {
    type: Date,
    default: new Date()
  },
  archived: {
    type: Boolean,
    default: false
  },
  user: Schema.Types.ObjectId,
  organization: Schema.Types.ObjectId,
  dependencies: [{
    version: String,
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project'
    }
  }],
  socketGroups: [{
    type: Schema.Types.ObjectId,
    ref: 'SocketGroup'
  }],
  generatedSocketGroups: {
    type: String
  },
  repositoryId: Number,
  meta: {
    type: Schema.Types.Mixed,
  }
},
{
  timestamps: true,
  collection: 'creators_studio__projects'
});


projectSchema.pre('save', function(next, done) {
  const self = this as any;
  Db.connection.models['Project'].findOne({ organization: self.organization, user: self.user, name: self.name, _id: { $ne: self._id } }, function(err, project) {
      if (err) {
         return next(err);
      } else if (project) {
          self.invalidate('name', 'Name must be unique per organization or user');
          return next(new Error('Name must be unique per organization or user'));
      }
      next();
  });
});

export type IProject = Document & Project;
export const ProjectSchema = Db.connection.model<IProject>('Project', projectSchema);
