import { Component, OnInit, Input, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { ViewerOptions, ViewerInitializedEvent, ViewerComponent, Extension } from 'ng2-adsk-forge-viewer';
import { MyExtension } from './ext';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ai-autodesk-viewer',
  templateUrl: './autodesk-viewer.component.html',
  styleUrls: ['./autodesk-viewer.component.scss']
})
export class AutodeskViewerComponent implements OnInit, OnDestroy {

  public viewerOptions: ViewerOptions;
  @ViewChild('robotDetails') robotDetails: TemplateRef<any>;

  @Input() viewerData: { autoDeskInfo: any, tokenInfo: { access_token: string, expires_in: number } };
  @ViewChild('forgeViewer') forgeViewer: ViewerComponent;

  modalRef: BsModalRef;
  subscription: Subscription;

  constructor(private modalService: BsModalService) { }

  ngOnInit() {
    this.initViewer();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  initViewer() {

    this.viewerOptions = {
      initializerOptions: {
        env: 'AutodeskProduction',
        getAccessToken: (onGetAccessToken: (token: string, expire: number) => void) => {
          const expireTimeSeconds = this.viewerData.tokenInfo.expires_in;
          onGetAccessToken(this.viewerData.tokenInfo.access_token, expireTimeSeconds);
        },
        api: 'derivativeV2',
        enableMemoryManagement: true
      },
      onViewerInitialized: (args: ViewerInitializedEvent) => {
        args.viewerComponent.DocumentId = this.viewerData.autoDeskInfo.urn;
      },
      viewerConfig: {
        extensions: [
          'Autodesk.DocumentBrowser',
          MyExtension.extensionName,
        ]
      },
      onViewerScriptsLoaded: () => {
        Extension.registerExtension(MyExtension.extensionName, MyExtension.bind(this));
        this.registerClick();

      }
    };
  }

  registerClick() {

    MyExtension.clickedMesh.subscribe(data => {
      this.openModal(this.robotDetails);
    });

  }
  documentChanged(event) {

  }

  openModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template);
  }

}
