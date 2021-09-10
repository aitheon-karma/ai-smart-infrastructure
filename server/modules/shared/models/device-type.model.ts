import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import {
  IsString,
  IsMongoId,
  IsOptional,
  IsDefined,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';




@JSONSchema({ description: 'DeviceType schema' })
export class DeviceType {

  @IsMongoId()
  _id: any;

  @IsString()
  name: string;

  @IsOptional()
  createdBy: any;

  @IsOptional()
  updatedBy: any;
}


const deviceTypeSchema = new Schema({
  name: {
      type: String,
      default: '',
      required: 'Please enter system type name',
      trim: true
  },
  description: {
      type: String,
      default: ''
  },
  /**
   * Commands array will hold the commands id under specific device type
   */
  commands: [{
      type: Schema.Types.ObjectId,
      ref: 'Command'
  }],
  /*
  *  Reference to system / infrastructure
  */
  system: {
      type: Schema.Types.ObjectId,
      ref: 'System'
  },
  /*
  *  Reference to organization
  */
  organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization'
  },
  /*
  * Reference to user that created
  */
  createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
  },
  /*
 * Reference to user that last updated it
 */
  updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'device_manager__device-type'
});

export type IDeviceType = Document & DeviceType;

export const DeviceTypeSchema = Db.connection.model<IDeviceType>('DeviceType', deviceTypeSchema);
