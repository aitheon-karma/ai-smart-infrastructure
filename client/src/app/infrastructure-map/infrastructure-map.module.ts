import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InfrastructureMapComponent } from './infrastructure-map.component';
import { CommonModule } from '@angular/common';
import { RoutePointControlComponent } from './components/route-point-control/route-point-control.component';
import { CommandModalComponent } from './components/command-modal/command-modal.component';
import { ShapeDropdownMenuComponent } from './components/shape-dropdown-menu/shape-dropdown-menu.component';
import { ClickOutsideDirective } from './shared/directives/click-outside.directive';
import { FocusDirective } from './shared/directives/focus.directive';

@NgModule({
  declarations: [
    InfrastructureMapComponent,
    RoutePointControlComponent,
    CommandModalComponent,
    ShapeDropdownMenuComponent,
    FocusDirective,
    ClickOutsideDirective,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  exports: [
    FocusDirective,
    InfrastructureMapComponent,
    CommandModalComponent,
    ShapeDropdownMenuComponent,
  ],
})
export class InfrastructureMapModule {}
