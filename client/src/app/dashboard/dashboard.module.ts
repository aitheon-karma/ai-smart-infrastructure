import { NgModule } from '@angular/core';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { CoreClientModule } from '@aitheon/core-client';
import { InfrastructuresModule } from '../infrastructures/infrastructures.module';
import { DashboardMapComponent } from './dashboard-map/dashboard-map.component';
import { AutomationModule } from './../automation/automation.module';
import { GoogleMapsModule } from '@angular/google-maps';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  imports: [
    CoreClientModule,
    DashboardRoutingModule,
    InfrastructuresModule,
    GoogleMapsModule,
    AutomationModule,
    SharedModule
  ],
  declarations: [DashboardComponent, DashboardMapComponent]
})
export class DashboardModule { }
