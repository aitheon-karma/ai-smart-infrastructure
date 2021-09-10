import { CoreClientModule } from '@aitheon/core-client';
import { InfrastructureMapModule } from '../infrastructure-map';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorPickerModule } from 'ngx-color-picker';
import { SharedModule } from '../shared/shared.module';
import { AreaFormComponent } from './area-form/area-form.component';
import { StructureRoutingModule } from './structure-routing.module';
import { StructureComponent } from './structure.component';
import { FloorsListComponent } from './floors-list/floors-list.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AreasToolbarComponent } from './areas-toolbar/areas-toolbar.component';
import { TooltipModule } from "ngx-bootstrap/tooltip";
import { DevicePopupComponent } from './device-popup/device-popup.component';
import { TaskProgressComponent } from './task-progress/task-progress.component';

@NgModule({
  declarations: [
    StructureComponent,
    FloorsListComponent,
    AreaFormComponent,
    AreasToolbarComponent,
    DevicePopupComponent,
    TaskProgressComponent,
  ],
  exports: [
    StructureComponent
  ],
    imports: [
        CommonModule,
        ColorPickerModule,
        ReactiveFormsModule,
        StructureRoutingModule,
        SharedModule,
        CoreClientModule,
        InfrastructureMapModule,
        TooltipModule.forRoot(),
    ]
})
export class StructureModule {
}
