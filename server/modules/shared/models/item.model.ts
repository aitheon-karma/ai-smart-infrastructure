/**
 * Module dependencies.
 */
import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import {
  IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested,
  IsMongoId, IsDate, IsDefined, IsOptional, Min, IsDateString,
  IsBoolean, IsArray
} from 'class-validator';
import { Type } from 'class-transformer';



export enum PricingType {
  MONTHLY = 'MONTHLY',
  ONE_TIME = 'ONE_TIME'
}

export enum promotionTypeEnum {
  BUY_ONE_GET = 'BUY_ONE_GET',
  DISCOUNT = 'DISCOUNT',
}

export enum ItemType {
  GOODS = 'GOODS',
  APP = 'APP',
  ASSEMBLY = 'ASSEMBLY',
  NODE = 'NODE',
  MODEL = 'MODEL'
}

@JSONSchema({ description: 'Promotion' })
export class Promotion {

  @IsEnum(promotionTypeEnum)
  @IsOptional()
  type: promotionTypeEnum;

  @IsNumber()
  @IsOptional()
  promotionValue: Number;

  @IsOptional()
  campaign: any;
}

@JSONSchema({ description: 'Material' })
export class Material {
  @IsOptional()
  @Type(() => Object)
  item: any;

  @IsOptional()
  @IsNumber()
  quantity: Number;
}

@JSONSchema({ description: 'Socket metadata schema' })
export class Rate {
  @IsMongoId()
  @IsOptional()
  _id?: string;

  @IsNumber()
  rate: Number;

  @IsDefined()
  createdBy: any;

  @IsDateString()
  @IsOptional()
  createdAt?: Date;
}


@JSONSchema({ description: 'Item' })
export class Item {
  @IsMongoId()
  _id: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsOptional()
  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsOptional()
  @IsString()
  summary: string;

  @Type(() => ItemProperty)
  @ValidateNested({ each: true })
  properties: Array<ItemProperty>;


  @Type(() => ItemFile)
  @ValidateNested({ each: true })
  images: Array<ItemFile>;


  @Type(() => ItemFile)
  @ValidateNested({ each: true })
  files: Array<ItemFile>;


  @IsBoolean()
  sellable: boolean;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsBoolean()
  privateApp?: boolean;

  @IsString()
  appStoreName?: string;

  @IsString()
  @IsOptional()
  productCode?: string;

  @IsString()
  description?: string;

  @Type(() => String)
  @ValidateNested({ each: true })
  @IsOptional()
  screenShots?: string[];

  @IsEnum(PricingType)
  @IsOptional()
  pricingType?: PricingType;

  @IsString()
  @IsOptional()
  marketCategoryId?: string;

  @IsMongoId()
  @IsOptional()
  organization: any;

  @IsString()
  @IsOptional()
  createdBy: any;

  @IsString()
  updatedBy: any;

  @Type(() => String)
  @ValidateNested({ each: true })
  @IsOptional()
  supplyChannels: Array<String>;

  @Type(() => Material)
  @ValidateNested({ each: true })
  @IsOptional()
  billOfMaterials: Array<Material>;

  @IsString()
  @IsOptional()
  creatorsStudioProjectId: any;

  @IsString()
  @IsOptional()
  provisionalNode: any;

  @IsString()
  @IsOptional()
  assetId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Rate)
  rates: Rate[];

  @IsNumber()
  @IsOptional()
  averageRating: number;

  @IsNumber()
  @IsOptional()
  taxRate: number;

  @Type(() => ItemReview)
  @ValidateNested({ each: true })
  review: Array<ItemReview>;

  @IsOptional()
  inventory: Array<any>;

  @IsString()
  @IsOptional()
  partNumber: string;

  @IsDateString()
  createdAt?: Date;

  @Type(() => Promotion)
  @ValidateNested({ each: true })
  promotions: Array<Promotion>;

  @IsString()
  @IsOptional()
  nodeStructure: string;
}

@JSONSchema({ description: 'Statistics about average prices and list of recently sold items' })
export class ItemStatistics {
  @IsNumber()
  @IsOptional()
  averagePrice: number;

  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  history: any[];
}

export class CategoryResult {
  count: number;
  category: any;
}

@JSONSchema({ description: 'Result of advanced search' })
export class ItemResult {
  @ValidateNested({ each: true })
  @Type(() => Item)
  items: Array<Item>;

  @ValidateNested({ each: true })
  @Type(() => Item)
  categories: Array<CategoryResult>;
}



@JSONSchema({ description: 'Item Review' })
export class ItemReview {
  @IsMongoId()
  _id?: string;

  @IsString()
  @IsOptional()
  comment: string;

  @IsNumber()
  @IsOptional()
  rating: number;

  @Type(() => String)
  @ValidateNested({ each: true })
  @IsOptional()
  likedBy?: Array<string>;

  @IsString()
  @IsOptional()
  user?: string;

  @IsDateString()
  createdAt?: Date;

  @ValidateNested({ each: true })
  @Type(() => ReviewReply)
  replies?: Array<ReviewReply>;

  @IsBoolean()
  @IsOptional()
  liked?: Boolean;
}


@JSONSchema({ description: 'Review Reply' })
export class ReviewReply {

  @IsMongoId()
  _id: string;

  @IsDateString()
  @IsOptional()
  createdAt?: Date;

  @IsString()
  @IsOptional()
  text: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
export class ItemProperty {

  @IsMongoId()
  _id: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  propType: string;

  @IsBoolean()
  @IsOptional()
  propRequired: boolean;

  @IsNumber()
  @IsOptional()
  orderIndex: Number;

  @IsString()
  @IsOptional()
  propValue: string;
}


@JSONSchema({ description: 'Item File' })
export class ItemFile {

  @IsMongoId()
  _id: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsDateString()
  createdAt: string;

  @IsString()
  filename: string;

  @IsString()
  @IsOptional()
  mimetype: string;

  @IsString()
  @IsOptional()
  url: string;
}

export const rateSchema = new Schema({
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rate: Number
},
{
  timestamps: true
});

const itemSchema = new Schema({
  name: {
    type: String,
    default: '',
    required: 'Please enter item name',
    trim: true
  },
  productCode: {
    type: String,
    default: ''
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  type: {
    type: String,
    enum: Object.keys(ItemType),
    default: ''
  },
  summary: {
    type: String,
    default: ''
  },
  taxRate: {
    type: Number
  },
  billOfMaterials: [{
    item: {
      type: Schema.Types.ObjectId,
      ref: 'Item'
    },
    quantity: Number
  }],
  properties: [{
    name: {
      default: '',
      type: String,
      required: 'Please enter property name',
      trim: true
    },
    propType: {
      default: 'String',
      type: String
    },
    propValue: {
      type: String
    },
    propRequired: {
      type: Boolean,
      default: false
    },
    orderIndex: Number,
  }],
  /*
  *  Reference to Inventory
  */
  inventory: [{
    location: Schema.Types.ObjectId,
    inStock: Number,
    available: Number,
    parentInventory: Schema.Types.ObjectId,
    expiryDate: Date,
    mfdDate: Date,
    type: {
      type: String,
      enum: ['BIN', 'GEO_LOCATION', 'SHUTTLE', 'PALLET', 'ROBOT', 'RACK_SHELVING', 'CARTON', 'STATION', 'CART'],
      default: 'GEO_LOCATION'
    },
    itemLocation: {
      location: String,
      name: String
    },
    allocations: [{
      type: {
        type: String,
        enum: ['ORDER', 'EXPIRED', 'PROJECT', 'DAMAGED', 'STORAGE'],
        default: 'ORDER'
      },
      order: Schema.Types.ObjectId,
      quantity: Number,
    }],
    algorithmic: {
      transportCost: Number,
      rank: Number
    },
  }],
  /*
  *  Reference to organization
  */
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  /*
  * Reference to user that last updated it
  */
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  /*
  * Reference to user that created
  */
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  /**
   * Related files
   */
  files: [{
    type: {
      type: String,
      enum: ['SALES_DOCUMENT', 'OTHER'],
      default: 'OTHER'
    },
    size: Number,
    mimetype: String,
    filename: String,
    createdAt: Date,
    url: String
  }],
  /**
   * Image
   */
  images: [{
    size: Number,
    mimetype: String,
    filename: String,
    createdAt: Date,
    url: String
  }],
  /**
   * Supply channels
   */
  supplyChannels: [String],

  /**
   * Market Place
   */
  salePrice: {
    type: Number,
    default: 0
  },
  sellable: {
    type: Boolean,
    default: false
  },

  partNumber: {
    type: String
  },

  privateApp: {
    type: Boolean,
    default: false
  },
  appStoreName: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  screenShots: [String],

  pricingType: {
    type: String,
    default: 'ONE_TIME',
    enum: ['ONE_TIME', 'MONTHLY']
  },
  marketCategoryId: {
    type: String,
    default: ''
  },
  creatorsStudioProjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  provisionalNode: {
    type: Schema.Types.ObjectId,
    ref: 'Node'
  },
  assetID: {
    type: String,
    default: undefined
  },
  promotions: [
    {
      type: {
        type: String,
        required: false,
        enum: ['BUY_ONE_GET', 'DISCOUNT']
      },
      promotionValue: {
        type: Number,
        required: false
      },
      campaign: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
        required: false,
      }
    }
  ],
  rates: [rateSchema],
  averageRating: {
    type: Number,
    default: 0
  }
},
  {
    timestamps: true,
    collection: 'item_manager__items'
  });

export type IItem = Document & Item;

export const ItemSchema = Db.connection.model<IItem>('Item', itemSchema);
