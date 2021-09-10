import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DeviceManagerDashboardComponent } from "./device-manager-dashboard/device-manager-dashboard.component";
import { DeviceManagerFormComponent } from "./device-manager-form/device-manager-form.component";
import {DeviceManagerDetailsComponent} from "./device-manager-details/device-manager-details.component";

const routes: Routes = [
  { path: '', component: DeviceManagerDashboardComponent, pathMatch: 'full' },
  { path: 'new', component: DeviceManagerFormComponent },
  { path: 'device/:deviceId', component: DeviceManagerDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeviceManagerRoutingModule { }
