import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Infrastructure, InfrastructureRestService } from '@aitheon/smart-infrastructure';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'ai-autodesk-controller',
  templateUrl: './autodesk-controller.component.html',
  styleUrls: ['./autodesk-controller.component.scss']
})
export class AutodeskControllerComponent implements OnInit, OnDestroy {


  constructor(private infrastructureService: InfrastructureRestService, private toastr: ToastrService) { }


  @Input() infrastructure: Infrastructure;
  loading = true;
  uploadView = false;
  processing = false;
  noFileFound = false;
  progress = '';
  viewerData: any;

  interval: any;

  ngOnInit() {
    localStorage.setItem('Autodesk.Viewing.Private.GuiViewer3D.SavedSettings.swapBlackAndWhite',JSON.stringify(true));
    // TO_DO: Rework for new requirements
    // this.infrastructureService.getInfrastructureLayout(this.infrastructure._id)
    // .subscribe((result: {autoDeskInfo: any, tokenInfo: {access_token: string, expires_in: string}}) => {
    //   // @ts-ignore
    //   if (!result) {
    //     this.processing = true;
    //     return;
    //   }
    //   this.loading = false;

    //   if (result.autoDeskInfo.status !== 'success') {
    //     this.processing = true;
    //     this.progress = result.autoDeskInfo.progress;
    //     this.initIntervalChecks();
    //   } else {
    //     this.processing = false;
    //     if (this.interval) { clearInterval(this.interval); }
    //     this.viewerData = result;
    //   }

    // }, err => {
    //   this.loading = false;
    //   this.noFileFound = true;
    //   this.uploadView = true;
    // });
  }



  canceled() {
    if (this.noFileFound) {
     return this.toastr.info('There is no other file uploaded. please upload a file');
    }

    this.uploadView = false;
    this.processing = false;
  }

  fileUploaded(uploadedData: any) {
    this.uploadView = false;
    this.processing = true;
    this.noFileFound = false;
    this.initIntervalChecks(true);
  }

  initIntervalChecks(newFile: boolean = false) {

    const urn = this.viewerData ? this.viewerData.autoDeskInfo.urn : '';
    // TO_DO: Rework for new requirements
    // this.interval = setInterval(() => {
    //   this.infrastructureService.getInfrastructureLayout(this.infrastructure._id)
    //   .subscribe((result: {autoDeskInfo: any, tokenInfo: {access_token: string, expires_in: string}}) => {
    //     this.loading = false;
    //     if (( !result || result.autoDeskInfo.status !== 'success' && !newFile) || (newFile && urn === result.autoDeskInfo.urn)) {
    //       this.processing = true;
    //       this.progress = result.autoDeskInfo.progress;
    //     } else {
    //       this.processing = false;
    //       if (this.interval) { clearInterval(this.interval); }
    //       this.viewerData = result;
    //     }

    //   }, err => {
    //     this.loading = false;
    //     this.noFileFound = true;
    //   });
    // }, 3000);
  }

  ngOnDestroy() {
    if (this.interval) { clearInterval(this.interval); }
  }

}




