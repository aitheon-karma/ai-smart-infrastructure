import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { DeviceManagerDashboardComponent } from './device-manager-dashboard/device-manager-dashboard.component';
import { DeviceManagerRoutingModule } from './device-manager-routing.module';
import { DeviceManagerListComponent } from './device-manager-list/device-manager-list.component';
import { DeviceManagerCardComponent } from './device-manager-card/device-manager-card.component';
import { DeviceManagerFormComponent } from './device-manager-form/device-manager-form.component';
import { CoreClientModule } from '@aitheon/core-client';
import { NgxMaskModule } from 'ngx-mask';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { DeviceManagerDetailsComponent } from './device-manager-details/device-manager-details.component';
import { DeviceManagerTaskCardComponent } from './device-manager-task-card/device-manager-task-card.component';
import { AvatarModule } from 'ngx-avatar';
import { TabsModule } from 'ngx-bootstrap/tabs';

@NgModule({
  declarations: [
    DeviceManagerDashboardComponent,
    DeviceManagerListComponent,
    DeviceManagerCardComponent,
    DeviceManagerFormComponent,
    DeviceManagerDetailsComponent,
    DeviceManagerTaskCardComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    DeviceManagerRoutingModule,
    CoreClientModule,
    AvatarModule,
    NgxMaskModule.forRoot(),
    TooltipModule.forRoot(),
    TabsModule.forRoot(),
  ]
})
export class DeviceManagerModule { }
