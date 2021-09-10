import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { DriveUploaderComponent, AuthService } from '@aitheon/core-client';
import { InfrastructureRestService, Infrastructure } from '@aitheon/smart-infrastructure';

@Component({
  selector: 'ai-autodesk-uploader',
  templateUrl: './autodesk-uploader.component.html',
  styleUrls: ['./autodesk-uploader.component.scss']
})
export class AutodeskUploaderComponent implements OnInit {

  constructor(private authService: AuthService, private infrastructureService: InfrastructureRestService) { }

  @ViewChild('driveFileUploader') driveFileUploader: DriveUploaderComponent;
  currentServiceKey: any;
  currentOrg: any;
  uploading = false;
  fileAdded = false;
  name: any;

  @Input() infrastructure: Infrastructure;
  @Output() uploaded = new EventEmitter<any>();
  @Output() canceled = new EventEmitter<any>();

  ngOnInit() {

    this.authService.activeOrganization.subscribe(org => {
      this.currentOrg = org;
      this.currentServiceKey = {
        _id: 'SMART_INFRASTRUCTURE',
        key:  org._id
      };
    });
  }

  upload() {
    this.uploading = true;
    this.driveFileUploader.uploadAll();
  }


  onSuccessFileUpload(uploadedData: any) {
    // this.infrastructureService.uploadLayout(this.infrastructure._id, uploadedData)
    // .subscribe(uploadResult => {
    //   this.uploaded.emit(uploadResult);
    //   this.uploading = false;
    // });
  }

  onAfterAddingFile($event) {
    this.fileAdded = true;
  }
}
