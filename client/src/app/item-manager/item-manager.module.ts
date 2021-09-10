import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ItemManagerRoutingModule } from './item-manager-routing.module';
import { ItemManagerListComponent } from './item-manager-list/item-manager-list.component';
import { OnlyNumbersDirective } from './shared/only-numbers.directive';
import { ItemsService } from './shared';
import { CoreClientModule } from '@aitheon/core-client';
import { ItemsCardComponent } from './items-card/items-card.component';
import { TypeaheadModule } from 'ngx-bootstrap/typeahead';
@NgModule({
  declarations: [ItemManagerListComponent, OnlyNumbersDirective, ItemsCardComponent],
  imports: [
    CommonModule,
    CoreClientModule,
    TypeaheadModule.forRoot(),
    ItemManagerRoutingModule
  ],
  providers: [ItemsService]
})
export class ItemManagerModule { }
