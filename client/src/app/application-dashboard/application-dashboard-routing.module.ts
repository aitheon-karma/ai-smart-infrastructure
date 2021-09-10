import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SiApplicationDashboardComponent } from './application-dashboard/application-dashboard.component';

const routes: Routes = [{
  path: 'dashboard/:graphId/:graphNodeId',
  component: SiApplicationDashboardComponent,
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: []
})
export class ApplicationDashboardRoutingModule {}
