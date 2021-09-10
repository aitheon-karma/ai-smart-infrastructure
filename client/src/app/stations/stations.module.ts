import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationsRoutingModule } from './stations-routing.module';
import { StationDashboardComponent } from './station-dashboard/station-dashboard.component';
import { CoreClientModule } from '@aitheon/core-client';
import { StationFormComponent } from './station-form/station-form.component';
import { StationPageComponent } from './station-page/station-page.component';
import { TooltipModule } from "ngx-bootstrap/tooltip";
import { SharedModule } from '../shared/shared.module';
import { StationCardComponent } from './station-card/station-card.component';

@NgModule({
  declarations: [
    StationDashboardComponent,
    StationFormComponent,
    StationPageComponent,
    StationCardComponent,
  ],
  imports: [
    CommonModule,
    CoreClientModule,
    StationsRoutingModule,
    TooltipModule.forRoot(),
    SharedModule,
  ]
})
export class StationsModule {
}
