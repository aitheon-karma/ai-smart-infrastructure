// import { ItemProperty } from '../../items/shared/item.model';
import { Category as CategoryRest, CategoryTemplate, CategorySummary, CategoryProperties } from '@aitheon/item-manager';

export class Category extends CategoryRest {

  opened: boolean;
  isLoading: boolean;

  constructor(base?: CategoryRest) {
    super();
    Object.assign(this, base);
    this.children = [];

    this.template = this.template ? this.template : new CategoryTemplate();
    this.template.summary = this.template.summary ? this.template.summary : new CategorySummary();

    this.template.properties = this.template.properties ? this.template.properties : [];
  }
}
