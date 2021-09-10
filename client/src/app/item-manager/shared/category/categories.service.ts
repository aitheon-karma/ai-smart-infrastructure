// tslint:disable-next-line: import-blacklist
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { CategoriesRestService, Category as CategoryRest, SharedRestService } from '@aitheon/item-manager';
import { Category } from './category';
import { map } from 'rxjs/operators';

@Injectable()
export class CategoriesService {

  constructor(
    private categoriesRestService: CategoriesRestService,
    private sharedRestService: SharedRestService
  ) { }

  list(parent?: string): Observable<Category[]>  {
    return this.categoriesRestService.list(parent)
    .pipe(map((categories: CategoryRest[]) => categories.map((c: CategoryRest) => new Category(c)) ));
  }

  get(categoryId?: string): Observable<Category> {

    return this.categoriesRestService.getByCategoryId(categoryId).pipe(map(c => new Category(c)));
  }

  rootTree(categoryId?: string): Observable<{ root: Category, path: string }> {
    return null;
    // return this.restService.fetch(`/api/categories/${ categoryId }/root`, undefined);
  }

  create(category: Category): Observable<Category> {
    return this.categoriesRestService.create(category).pipe(map(c => new Category(c)));
  }

  update(category: Category): Observable<Category> {
    console.log(category);
    return this.categoriesRestService.update(category._id, category).pipe(map(c => new Category(c)));
  }

  remove(categoryId: string): Observable<Category> {
    return this.categoriesRestService._delete(categoryId).pipe(map(c => new Category(c)));
  }

  listAll() {
    return this.categoriesRestService.list('', true)
    .pipe(map((categories: CategoryRest[]) => categories.map((c: CategoryRest) => new Category(c)) ));
  }


  listAllParentProperties(firstParentId: string) {
    return this.categoriesRestService.listAllParentProperties(firstParentId);
  }

  // This is only temporary, will be removed soon.
  enableDrive() {
    return this.sharedRestService.sharedControllerEnableDrive();
  }
}
