import { InfrastructureRestService } from '@aitheon/smart-infrastructure';
import { Component, OnInit, TemplateRef } from '@angular/core';
import { ItemsService, Item, Search, ProductFilters } from '../shared';
import { Location } from '@angular/common';
import * as _ from 'lodash';
import { Category } from '../shared/category';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ai-item-manager-list',
  templateUrl: './item-manager-list.component.html',
  styleUrls: ['./item-manager-list.component.scss']
})
export class ItemManagerListComponent implements OnInit {

  constructor(private itemsService: ItemsService,
    private toastr: ToastrService,
    private infrastructureRestService: InfrastructureRestService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private modalService: BsModalService) { }

  searchFocused: boolean;
  searchValue;
  noResult: any;
  searchFocus: boolean = false;

  categories: Array<Category>;
  items: any = [];
  search = new Search();
  selectedCategory: Category;
  editedCategory: Category;
  isLoadingItems = false;
  isLoadingCategories = false;
  itemsList: Item[];
  facets: any;
  sortingEvent: any;
  loading = true;
  productFilters: ProductFilters = new ProductFilters();
  categoryName: any = 'All Items';
  facetSearch: Search;
  min: number;
  max = 0;
  categoryIdParam: string;
  listChange: any;

  sortValues: any = [
    { _id: '-1', name: 'Recently added' },
    { _id: '0', name: 'Published Only' },
    // { _id: '1', name: 'Sales' },
    // { _id: '2', name: 'Ratings (High to Low)' },
    // { _id: '3', name: 'Ratings (Low to High)' },
    { _id: '4', name: 'Price (Lowest First)' },
    { _id: '5', name: 'Price (Highest First)' },
  ];

  sortConfig = {
    displayKey: 'name',
    search: false
  };
  infrastructureInfo: any = {};
  ngOnInit() {
    if (JSON.parse(localStorage.getItem('infrastructure'))) {
      this.infrastructureInfo = JSON.parse(localStorage.getItem('infrastructure'));
    }
    this.listChange = 2;
    // this.route.queryParams.subscribe(params => {
    //   this.categoryIdParam = params.categoryId;
    // });
    if (this.categoryIdParam) {
      this.search.categories = new Array<string>();
      this.search.categories.push(this.categoryIdParam);
    }
    this.loadItems(this.search);
    // this.getAllItems();
    // this.itemsService.search.subscribe((facetSearch: Search) => {
    //   this.loadItems(facetSearch);
    // });

    this.sortingEvent = 'Aa-Zz';
  }

  getAllItems() {
    this.loading = true;
    this.itemsService.searchItems().subscribe((response: any) => {
      this.itemsList = response;
      this.items = response;
      this.noResult = false;
      this.items = this.items.map(elements => {
        const inStock = this.getAvailable(elements);
        if (inStock > this.max) {
          this.max = inStock;
        }
        if ((inStock < this.min) || (this.min === undefined)) {
          this.min = inStock;
        }
        return elements;
      });
      this.facets = response;
      this.loading = false;
    }, (err) => {
      this.loading = false;
      this.toastr.error(err);
    }); 
  }

  loadItems(search) {
    if (search.categories && search.categories[0] === '-1') {
      (search.categories as []).splice(0, 1);
    }
    this.loading = true;
    this.items = null;
    // this.itemsService.advancedSearch(search).subscribe((items) => {
    //   this.itemsList = items.items;
    //   this.loading = false;
    //   this.items = items.items.map((item: Item) => {
    //     const inStock = this.getAvailable(item);
    //     if (inStock > this.max) {
    //       this.max = inStock;
    //     }
    //     if ((inStock < this.min) || (this.min === undefined)) {
    //       this.min = inStock;
    //     }
    //     return item;
    //   });
    //     console.log(items.items);
    //   this.categoryName = Array.from(new Set((items.items as any[]).map(i => i.category && i.category.name)));
    //   if (this.categoryName.length === items.facets.length) {
    //     this.categoryName = 'All Items';
    //   } else if (!this.categoryName.length) {
    //     this.categoryName = 'No items';
    //   }
    //   this.facets = items;
    //   this.notifyFilterChange();
    // },
    //   (err) => {
    //     this.loading = false;
    //     this.toastr.error(err);
    //   });

    this.infrastructureRestService.getById(this.infrastructureInfo.Id).subscribe(i => {
      this.items = i.items;
      this.loading = false;
    })
  }

  triggerSearch(search) {
    this.search.term = search.term;
    this.loadItems(this.search);
  }

  triggerFacetSearch(facetSearch: Search): any {
    // if (facetSearch.term) {
    //   const key = facetSearch.term.split('(');
    //   facetSearch.term = key[0].trim();
    // }
    this.categoryName = facetSearch.categoryName;
    this.loadItems(facetSearch);
  }

  triggerData(data: any): any {
    this.productFilters = data;
  }

  listViewChange(data: any) {
    this.listChange = data;
  }
  productSorting(sortingEvent) {
    this.productFilters.addSorting(sortingEvent);
    this.notifyFilterChange();
  }

  sortProduct<T>(prop: (c: any) => T, order: 'ASC' | 'DESC'): void {
    this.items.sort((a, b) => {
      if (prop(a) < prop(b)) {
        return -1;
      }
      if (prop(a) > prop(b)) {
        return 1;
      }
      return 0;
    });
    if (order === 'DESC') {
      this.items.reverse();
    }
  }

  getAvailable(item: Item) {
    let sum = 0;
    if (item.inventory) {
      const length = item.inventory.length;
      for (let i = 0; i < length; i++) {
        sum = sum + item.inventory[i].available;
      }
    }
    return sum;
  }

  sortingChange(val) {

    this.items = this.facets.items;
    if (val.value.name === 'Recently added') {
      this.items = this.items.sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (val.value.name === 'Published Only') {
      this.items = this.items.filter(p => {
        if (p.sellable) {
          return true;
        } else {
          return false;
        }
      });
    } else if (val.value.name === 'Price (Highest First)') {
      this.items = this.items.sort(function (a, b) {
        return b.salePrice - a.salePrice;
      });
    } else if (val.value.name === 'Price (Lowest First)') {
      this.items = this.items.sort(function (a, b) {
        return a.salePrice - b.salePrice;
      });
    }

  }

  public notifyFilterChange() {
    if (!this.productFilters) {
      this.items = this.items;
      return;
    }
    this.items = this.facets.items;
    // logic for applying filters below
    // Price filter
    if (['LOWESTPRICEFIRST', 'HIGHESTPRICEFIRST'].indexOf(this.productFilters.sortingProduct) != -1) {
      this.sortProduct(p => p.averageRating, (this.productFilters.sortingProduct == 'LOWESTPRICEFIRST' ? 'ASC' : 'DESC'));
    }

    // Published Filter
    if (['PUBLISHED'].indexOf(this.productFilters.sortingProduct) != -1) {
      this.items = this.items.filter(p => {
        return p.marketCategoryId && p.sellable;
      });
    }

    // color filter

    if (this.productFilters.colorFilter.length) {
      this.items = this.items.filter((item) => {
        let colorProps: any;
        colorProps = item.properties.filter((property) => {
          return ['Color', 'Colour', 'color', 'colour'].indexOf(property.name) != -1;
        });
        const onlyValues = colorProps.map((prop) => {
          return prop.propValue;
        });
        let matched = false;
        onlyValues.forEach(val => {
          if (this.productFilters.colorFilter.indexOf(val) != -1) {
            matched = true;
          }
        });
        return matched;
      });
    }

    if ((this.productFilters.stockFilter.min !== undefined) && this.productFilters.stockFilter.max) {

      this.items = this.items.filter((item) => {
        let sum = 0;
        item.inventory.forEach(element => {
          sum += Number(element.inStock);
        });
        if (sum >= this.productFilters.stockFilter.min && sum <= this.productFilters.stockFilter.max) {
          return true;
        } else {
          return false;
        }
      });
    }

    if (this.productFilters.stockStatusFilter.length) {

      this.items = this.items.filter((item) => {
        let sum = 0;
        item.inventory.forEach(element => {
          sum += Number(element.inStock);
        });
        if (sum > 0) {
          return true;
        } else {
          return false;
        }
      });
    }

    if (this.productFilters.orgFilter.length) {
      this.items = this.items.filter((item: any) => {
        return this.productFilters.orgFilter.indexOf(item.organization.name) != -1;
      });
    }
    // Review filter
    if (['HIGHESTRATINGSFIRST', 'LOWESTRATINGSFIRST'].indexOf(this.productFilters.sortingProduct) != -1) {
      this.sortProduct(p => p.salePrice, (this.productFilters.sortingProduct == 'LOWESTRATINGSFIRST' ? 'ASC' : 'DESC'));
    }

    if (this.productFilters.sortingProduct == 'Aa-Zz') {
      this.items.sort(function (a, b) {
        let x: any;
        let y: any;
        x = a['name'].toLowerCase();
        y = b['name'].toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
      });
      this.sortingEvent = 'Zz-Aa';
    } else {
      this.items.sort(function (a, b) {
        let x: any;
        let y: any;
        y = a['name'].toLowerCase();
        x = b['name'].toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
      });
      this.sortingEvent = 'Aa-Zz';
    }
  }

  onSaveItem(item: Item) {
    this.loadItems(this.search);
  }

  redirectToSmartInfrastructure() {
    localStorage.setItem('smart-infratsructure', JSON.stringify(false));
  }

  clearSearch(event: Event, search) {
    event.preventDefault();
    event.stopPropagation();
    this.searchValue = '';
    this.noResult = false;
    this.loadItems(this.search);
    search.focus();
  }

  onBlur() {
    setTimeout(() => {
      this.searchFocused = false;
    }, 100);
  }

  isFocus() {
    this.searchFocus = !this.searchFocus;
  }

  searchItems(searchText) {
    this.searchFocused = true;
    this.loading = true;
    const key = searchText.replace('(', '');
    const searchKey = key.replace(')', '');
    const categoryId = ["-1"];
    const categoryName = 'All Items';
    const data: any = {
      term: searchKey,
      categories: categoryId,
      isFromCreatorsStudio: false,
      categoryName: categoryName
    };
    this.itemsService.advancedSearch(data).subscribe((items: any) => {
      this.itemsList = items.items;
      this.items = items.items;
      this.loading = false;
    }, (err) => {
      this.loading = false;
    });
  }

  typeaheadNoResults(event: boolean): void {
    this.noResult = event;
  }

  onSelect(event) {
    this.items = [];
    this.loading = true;
    this.itemsService.get(event.item._id).subscribe((res: any) => {
      this.items.push(res);
      this.loading = false;
    }, (err) => {
      this.loading = false;
      this.toastr.error(err);
    });
  }
}
