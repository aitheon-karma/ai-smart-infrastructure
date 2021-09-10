/**
 * Module dependencies.
 */
import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';

const organizationSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    unique: true,
    required: true
  },
  billing: {
    lowBalance: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['PAID', 'SUSPENDED'],
      default: 'PAID'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export const OrganizationSchema = Db.connection.model('Organization', organizationSchema);

export const organizationPopulateDefaults = '_id name profile.avatarResolutions.thumbnail';
