import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AutodeskRoutingModule } from './autodesk-routing.module';
import { AutodeskUploaderComponent } from './autodesk-uploader/autodesk-uploader.component';
import { AutodeskViewerComponent } from './autodesk-viewer/autodesk-viewer.component';
import { AutodeskControllerComponent } from './autodesk-controller/autodesk-controller.component';
import { CoreClientModule } from '@aitheon/core-client';
import { ViewerModule } from 'ng2-adsk-forge-viewer';

@NgModule({
  declarations: [AutodeskUploaderComponent, AutodeskViewerComponent, AutodeskControllerComponent],
  imports: [
    CommonModule,
    AutodeskRoutingModule,
    CoreClientModule,
    ViewerModule
  ],
  exports: [AutodeskControllerComponent]
})
export class AutodeskModule { }
