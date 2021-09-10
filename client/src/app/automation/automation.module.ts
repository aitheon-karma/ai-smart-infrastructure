import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutomationRoutingModule } from './automation-routing.module';
import { CoreClientModule } from '@aitheon/core-client';
import { AutomationDashboardComponent } from './automation-dashboard.component';

@NgModule({
  imports: [
    CommonModule,
    AutomationRoutingModule,
    CoreClientModule,
  ],
  declarations: [AutomationDashboardComponent],
})
export class AutomationModule { }
