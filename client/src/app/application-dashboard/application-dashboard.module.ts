import { CoreClientModule } from '@aitheon/core-client';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { ApplicationDashboardRoutingModule } from './application-dashboard-routing.module';
import { SiApplicationDashboardComponent } from './application-dashboard/application-dashboard.component';

@NgModule({
  declarations: [SiApplicationDashboardComponent],
  imports: [
    CommonModule,
    ApplicationDashboardRoutingModule,
    CoreClientModule,
    SharedModule,
  ],
})
export class ApplicationDashboardModule { }
