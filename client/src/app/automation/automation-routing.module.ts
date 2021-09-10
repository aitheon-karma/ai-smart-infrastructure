import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AutomationDashboardComponent } from './automation-dashboard.component';

const routes: Routes = [
  {
    path: '', component: AutomationDashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AutomationRoutingModule { }
