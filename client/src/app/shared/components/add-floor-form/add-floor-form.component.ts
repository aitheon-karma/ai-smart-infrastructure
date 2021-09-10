import { Infrastructure, Floor, InfrastructureRestService } from '@aitheon/smart-infrastructure';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, Validators, FormGroup, AbstractControl } from '@angular/forms';
import { Component, OnInit, Output, EventEmitter, ViewChild, Input, ElementRef } from '@angular/core';
import { DriveUploaderComponent, AuthService, ModalService } from '@aitheon/core-client';
import { FloorStatus } from '../../enums';

export interface UpdatedInfrastructureData {
  infrastructure: Infrastructure;
  floorNumber: number;
}

@Component({
  selector: 'ai-add-floor-form',
  templateUrl: './add-floor-form.component.html',
  styleUrls: ['./add-floor-form.component.scss']
})
export class AddFloorFormComponent implements OnInit {

  @ViewChild('driveUploader') driveUploader: DriveUploaderComponent;
  @ViewChild('uploadFiles') uploadFiles: ElementRef;
  @Output() close: EventEmitter<UpdatedInfrastructureData> = new EventEmitter<UpdatedInfrastructureData>();
  @Input() infrastructure: Infrastructure;
  @Input() type: string;
  @Input() shapes: number;
  @Input() tasks: number;
  @Input() selectedFloor: Floor;
  @Input() floorForReturn: Floor;

  floor: FormGroup;
  loading: boolean = false;
  submitted = false;
  logo: any;
  logoError: boolean = true;
  options = [];
  currentOrganization: any;
  serviceKey: { _id: string; key: string };

  get floorNumber(): AbstractControl {
    return this.floor.get('number');
  }

  constructor(private fb: FormBuilder,
              private toastr: ToastrService,
              private infrastructureRestService: InfrastructureRestService,
              private modalService: ModalService,
              private authService: AuthService) {
  }

  ngOnInit(): void {
    this.buildForm();
    this.getActiveOrg();

    this.selectedFloor ? this.logo = this.selectedFloor.uploadedFile : '';
  }

  getActiveOrg() {
    this.authService.activeOrganization.subscribe((organization: any) => {
      this.currentOrganization = organization;
      if (this.currentOrganization.locations.length > 0) {
        this.options = this.currentOrganization.locations;
      }
      this.serviceKey = {
        _id: 'SMART_INFRASTRUCTURE',
        key: `${this.currentOrganization._id}`
      };
    });
  }

  buildForm() {
    this.floor = this.fb.group({
      number: [this.selectedFloor ? this.selectedFloor.number : '', Validators.required],
      name: [this.selectedFloor ? this.selectedFloor.name : '', [Validators.required, Validators.maxLength(30)]],
      pixelScale: [this.selectedFloor ? this.selectedFloor.pixelScale : '', Validators.required]
    });

    this.addFloorNumberListener();
  }

  onCloseForm( updatedInfrastructureData: { infrastructure: Infrastructure, floorNumber: number }): void {
    this.close.emit(updatedInfrastructureData);
    document.querySelector('body').classList.add('overflow-hidden');
  }

  failedUpload(event: any) {
    this.toastr.error('File upload failed');
  }

  onAfterAdd(event) {
    let sizeNotAllowed = false;
    let typeNotAllowed = false;
    let errorMessage = '';
    if (event.file.size / 1000 / 1000 > 314.6) {
      sizeNotAllowed = true;
      errorMessage = 'File size limit exceeded, should be less than 300 MB.';
    }
    if (!event.file.type.match('image.png')) {
      typeNotAllowed = true;
      errorMessage = 'You can upload only PNG files';
    }
    if (sizeNotAllowed || typeNotAllowed) {
      this.driveUploader.uploader.cancelAll();
      this.driveUploader.uploader.clearQueue();
      this.toastr.error(errorMessage);
    }
  }

  onSuccessUpload(event: any) {
    this.logo = {
      signedUrl: event.signedUrl,
      name: event.name,
      contentType: event.contentType
    };
  }

  onNewOrgSubmit() {
    this.submitted = true;

    if (this.floor.invalid) {
      return;
    }

    if (this.floorNumber.value) {
      if (!this.logo) {
        this.logoError = true;
        return;
      }
    }

    const isExistingNumber = this.infrastructure.floors.some((floor: Floor) => floor.number === this.floor.value.number);

    if (isExistingNumber) {
      this.logoError = true;
      return this.toastr.error('Duplicate floor number');
    }

    const floorToCreate = {
      ...this.floor.value,
      uploadedFile: this.logo,
      status: FloorStatus.ACTIVE
    } as Floor;

    this.infrastructureRestService.createFloor(this.infrastructure._id, floorToCreate)
      .subscribe((infrastructure: Infrastructure) => {
          this.toastr.success('Floor added');
          this.onCloseForm({infrastructure, floorNumber: floorToCreate.number});
        },
        err => this.toastr.error(err.message || err));
  }

  onUpdateFloor() {
    this.submitted = true;

    if (this.floor.invalid) {
      return;
    }

    if (!this.logo) {
      this.logoError = true;
      return;
    }

    const isExistingNumber = this.infrastructure.floors.some(
      (floor: Floor) => floor.number === this.floor.value.number && floor._id !== this.selectedFloor._id
    );

    if (isExistingNumber) {
      this.logoError = true;
      return this.toastr.error('Duplicate floor number');
    }

    const floorToUpdate = {
      _id: this.selectedFloor._id,
      ...this.floor.value,
      uploadedFile: this.logo,
      status: FloorStatus.ACTIVE
    } as Floor;

    this.infrastructureRestService.updateFloor(this.infrastructure._id, floorToUpdate)
      .subscribe((infrastructure: Infrastructure) => {
          this.toastr.success('Floor updated');
          this.onCloseForm({infrastructure, floorNumber: floorToUpdate.number});
        },
        err => this.toastr.error(err.message || err));
  }

  confirm() {
    if (this.shapes > 0 || this.tasks > 0) {
      this.modalService.openGenericConfirm({
        text: `You have ${this.shapes} active ${this.shapes === 1 ? 'shape' : 'shapes'} ${this.tasks > 0 ? 'and ' + this.tasks + ' tasks' : ''} on this floor. If you choose to continue, all objects will be removed from the system.`,
        headlineText: `Replace floor map`,
        confirmText: `Continue`,
        creationConfirm: true,
        hideHeaderCancelButton: true,
        callback: (confirm) => {
          if (confirm) {
            this.uploadFiles.nativeElement.click();
          }
        }
      });
    }
  }

  public isNumber(value: string): boolean {
    return isNaN(parseInt(value));
  }

  public isFloorNumberValid(event): boolean {
    const isMinus = event.charCode === 45 || event.charCode === 109 || event.key === '-';
    const isCorrectCharacter = (event.charCode === 8 || event.charCode === 0 || event.charCode === 13)
      ? false
      : ((event.charCode >= 48 && event.charCode <= 57) || isMinus);
    const hasMinusAlready = event.target.value[0] === '-';
    const maxLength = hasMinusAlready ? 4 : 3;
    const isLess = event.target.value.length < maxLength;

    if ((isMinus && hasMinusAlready) || !isCorrectCharacter || (!isMinus && !isLess)) {
      return false;
    } else if (isMinus) {
      event.target.value = event.key + event.target.value;
      return false;
    }
  }

  private addFloorNumberListener(): void {
    this.floorNumber.valueChanges
      .subscribe(value => {
        const newValue = value ? value.toString() : '';
        const maxLength = (newValue[0] === '-') ? 4 : 3;

        if (newValue.length > maxLength) {
          this.floorNumber.patchValue(newValue.slice(0, maxLength));
        }
      });
  }
}
