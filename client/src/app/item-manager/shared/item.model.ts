import { Category } from '../shared/category';
import { Supplier } from './supplier.model';
import { CategoriesRestService, Category as CategoryRest, Item as ItemRest } from '@aitheon/item-manager';

export class Item extends ItemRest   {


  // not so sure about the below 2 fields, It's not present in db.
  purchase_price: number;
  average_price: number;

  brandName: string;
  billOfMaterials?: Array<ItemMaterial>;

  constructor(base?: ItemRest) {
    super();
    if (base) { Object.assign(this, base); }

    this.properties = this.properties ? this.properties : [];
  }
}



// Below code for marketplace approval which will have to refactored after makeplace has a stable template
export class ItemApproval {
  _id?: string;
  item?: string;
  status?: Status;
  description?: string;
  organization?: string;
  appStoreName: string;
  marketCategoryId: string;
  pricingType: PricingType;
  privateApp: boolean;
  properties: Array<ItemProperty>;
  billOfMaterials?: Array<ItemMaterial>;
  partNumber?: string;
  salePrice: number;
  type: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export enum Status {
  PENDING,
  DECLINED,
  APPROVED
}

export enum PricingType {
  MONTHLY,
  ONE_TIME
}

export class ItemProperty {
  name: string;
  propType: string;
  propRequired: boolean;
  orderIndex: Number;
  propValue: string;
}

export class ItemMaterial {
  item: any;
  quantity: number
}

