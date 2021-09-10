import { StationPageComponent } from './station-page/station-page.component';
import { StationFormComponent } from './station-form/station-form.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StationDashboardComponent } from './station-dashboard/station-dashboard.component';

const routes: Routes = [
  { path: '', component: StationDashboardComponent },
  { path: 'new', component: StationFormComponent },
  { path: ':stationId', component: StationPageComponent },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StationsRoutingModule { }
