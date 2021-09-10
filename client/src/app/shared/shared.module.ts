import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddApplicationModalComponent } from './components/add-application-modal/add-application-modal.component';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavMenuComponent } from './components/nav-menu/nav-menu.component';
import { AiTooltipDirective } from './directives/ai-tooltip.directive';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { DisableControlDirective } from './directives/disable-control.directive';
import { FiltersPanelComponent } from './components/filters-panel/filters-panel.component';
import { CoreClientModule } from '@aitheon/core-client';
import { AddFloorFormComponent } from './components/add-floor-form/add-floor-form.component';
import { FocusDirective } from './directives/focus.directive';
import { PrettyEnumPipe } from './pipes/pretty-enum.pipe';
import { ReplacePipe } from './pipes/replace-underscore.pipe';
import { DevicePanelComponent } from './components/device-panel/device-panel.component';
import { TaskInfoComponent } from './components/task-info/task-info.component';
import { TooltipComponent } from './components/tooltip/tooltip.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { AutodetectModalComponent } from './components/autodetect-modal/autodetect-modal.component';
import { RequestModalComponent } from './components/request-modal/request-modal.component';
import { AddDeviceModalComponent } from './components/add-device-modal/add-device-modal.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { TreeDropdownComponent } from './components/tree-dropdown/tree-dropdown.component';
import { BatteryHealthComponent } from './components/battery-health/battery-health.component';
import { NoPermissionToPayModalComponent } from './components/no-permission-to-pay-modal/no-permission-to-pay-modal.component';
import { BillingPaymentSectionComponent } from './components/billing-payment-section/billing-payment-section.component';

@NgModule({
  declarations: [
    NavMenuComponent,
    DisableControlDirective,
    ClickOutsideDirective,
    AiTooltipDirective,
    FocusDirective,
    FiltersPanelComponent,
    AddFloorFormComponent,
    PrettyEnumPipe,
    ReplacePipe,
    DevicePanelComponent,
    TaskInfoComponent,
    TooltipComponent,
    AutodetectModalComponent,
    AddApplicationModalComponent,
    RequestModalComponent,
    AddDeviceModalComponent,
    TreeDropdownComponent,
    BatteryHealthComponent,
    NoPermissionToPayModalComponent,
    BillingPaymentSectionComponent,
  ],
  imports: [
    RouterModule,
    CommonModule,
    CoreClientModule,
    TooltipModule.forRoot(),
    NgSelectModule,
    FormsModule,
    ReactiveFormsModule,
    ColorPickerModule,
  ],
  exports: [
    NavMenuComponent,
    DisableControlDirective,
    FiltersPanelComponent,
    AddFloorFormComponent,
    ClickOutsideDirective,
    AiTooltipDirective,
    FocusDirective,
    NavMenuComponent,
    PrettyEnumPipe,
    ReplacePipe,
    DevicePanelComponent,
    TooltipComponent,
    AutodetectModalComponent,
    RequestModalComponent,
    AddDeviceModalComponent,
    BatteryHealthComponent,
    AddApplicationModalComponent,
    NoPermissionToPayModalComponent,
    BillingPaymentSectionComponent,
  ]
})
export class SharedModule {}
