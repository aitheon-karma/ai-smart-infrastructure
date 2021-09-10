import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ActivityDashboardComponent } from './activity-dashboard/activity-dashboard.component';


const routes: Routes = [
  {
    path: '', component: ActivityDashboardComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ActivityRoutingModule { }
