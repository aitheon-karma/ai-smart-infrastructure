// tslint:disable-next-line: import-blacklist
import { Observable, ReplaySubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { Item } from './item.model';
import { ItemRestService, CategoriesRestService, Item as ItemRest, Inventory, ItemFile } from '@aitheon/item-manager';
import { map } from 'rxjs/operators';
import { RestService } from '@aitheon/core-client';
import { environment } from 'src/environments/environment';

@Injectable()
export class ItemsService {

  private _search: ReplaySubject<any> = new ReplaySubject(1);
  search: Observable<any> = this._search.asObservable();

  constructor(private itemRestService: ItemRestService, private restService: RestService, private categoryRestService: CategoriesRestService) { }

  list(categoryId: string): Observable<Item[]> {
    return this.categoryRestService.listByCategory(categoryId).pipe(map((items: ItemRest[]) => items.map((i: ItemRest) => new Item(i))));
  }
  searchItems(): Observable<Item> {
    return this.restService.fetch(environment.baseApi + environment.itemManagerURI + `/api/items/search`, null, true);
  }

  get(itemId: string): Observable<Item> {
    return this.restService.fetch(environment.baseApi + environment.itemManagerURI + `/api/items/${itemId}`, null, true).pipe(map(item => new Item(item)));
  }

  getStatistics(itemId: string): Observable<any> {
    return this.itemRestService.getStatistics(itemId);
  }

  create(item: Item): Observable<Item> {
    return this.itemRestService.create(item).pipe(map(i => new Item(i)));
  }

  advancedSearch(search: any): Observable<any> {
    return this.restService.post(environment.baseApi + environment.itemManagerURI + `/api/items/search`, search, true).pipe(map(res => {
      res.items = res.items.map(i => new Item(i));
      Object.defineProperty(res, 'facets', { value: res.categories, writable: false });
      delete res.categories;
      return res;
    }));
  }

  update(item: Item): Observable<Item> {
    return this.itemRestService.update(item._id, item).pipe(map(i => new Item(i)));
  }

  remove(itemId: string): Observable<Item> {
    return this.itemRestService._delete(itemId).pipe(map(i => new Item(i)));
  }

  addStockItem(inventory: Inventory, inStock: any, itemId: string): Observable<Item> {
    // return this.restService.post(`/api/items/addStock/${itemId}`, inStock);
    // bacause inventory will be handled in a different way.

    return null;
  }
  updateItemProperties(itemId: string, item: any): Observable<Item> {
    return this.itemRestService.updateProperties(itemId, item).pipe(map(i => new Item(i)));
  }
  updateInventory(itemId: string, inventory: Inventory) {
    // return this.restService.put(`/api/items/${itemId}/updateInventory`, inventory);
    // bacause inventory will be handled in a different way.

    return null;
  }

  addFile(itemId: string, itemFile: ItemFile): Observable<Item> {
    return this.itemRestService.addFile(itemId, itemFile).pipe(map(i => new Item(i)));
  }

  removeFile(itemId: string, fileId: string) {
    return this.itemRestService.deleteFile(itemId, fileId);
  }

  saveBills(itemId: string, bills: any) {
    return this.itemRestService.saveBills(itemId, bills);
  }

  saveItemConfig(configPayload: any) {
    return this.restService.post(`/api/item/config`, configPayload);
  }
  getConfigById(itemId) {
    return this.restService.fetch(`/api/item/config/${itemId}`);
  }
  getInventoryLogs(timeSpan, itemId) {
    return this.restService.fetch(`/api/item/config/inventoryLogs/${itemId}?timespan=${timeSpan}`);
  }
}

