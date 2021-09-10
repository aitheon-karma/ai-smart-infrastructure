import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';

import { InfrastructuresRoutingModule } from './infrastructures-routing.module';
import { InfrastructuresListComponent } from './infrastructures-list/infrastructures-list.component';
import { InfrastructuresDashboardComponent } from './infrastructures-dashboard/infrastructures-dashboard.component';
import { InfrastructuresFormComponent } from './infrastructures-form/infrastructures-form.component';
import { InfrastructuresItemComponent } from './infrastructures-item/infrastructures-item.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CoreClientModule } from '@aitheon/core-client';
import { InfrastructureComponent } from './infrastructure/infrastructure.component';
import { StructureModule } from '../structure/structure.module';
// import { AutodeskModule } from '../autodesk/autodesk.module';

@NgModule({
  declarations: [
    InfrastructuresListComponent,
    InfrastructuresDashboardComponent,
    InfrastructuresFormComponent,
    InfrastructuresItemComponent,
    InfrastructureComponent,
  ],
  imports: [
    // AutodeskModule,
    CommonModule,
    SharedModule,
    CoreClientModule,
    InfrastructuresRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    StructureModule,
  ],
  exports: [InfrastructuresListComponent]
})
export class InfrastructuresModule {}
