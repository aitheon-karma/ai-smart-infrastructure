import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsDefined, IsMongoId } from 'class-validator';

@JSONSchema({ description: 'User filter' })
export class User {

  @IsMongoId()
  _id: string;

 @IsDefined()
 profile: any;

}

/**
 * Database schema/collection
 */
const userSchema = new Schema({
  email: String,
  profile: {
    firstName: String,
    lastName: String,
    birthday: String,
    avatarUrl: String
  },
  roles: [{
    _id: false,
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    role: {
      type: String,
      enum: ['Owner', 'SuperAdmin', 'OrgAdmin', 'User'],
      default: 'User'
    },
    teams: [{
      type: Schema.Types.ObjectId,
      ref: 'Team'
    }],
    services: [{
      service: {
        type: String,
        ref: 'Service',
      },
      role: {
        type: String,
        enum: ['ServiceAdmin', 'User'],
        default: 'User'
      }
    }]
  }],
},

  {
    timestamps: true,
    collection: 'users'
  });

  export type IUser = Document & User;
  export const UserSchema = Db.connection.model<IUser>('User', userSchema);

export const userDefaultPopulate = 'email profile.firstName profile.lastName profile.avatarUrl username';
export const userRolesPopulate = 'email profile.firstName profile.lastName profile.avatarUrl roles';
