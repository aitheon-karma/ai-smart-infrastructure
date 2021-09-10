import { DriveUploaderComponent, AuthService } from '@aitheon/core-client';
import { Component, OnInit, EventEmitter, Output, ViewChild, Input, AfterViewInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  InfrastructureRestService,
  Device,
  FileModel,
  Station as StationModel,
  Infrastructure,
  StationsRestService
} from '@aitheon/smart-infrastructure';
import { StationType } from '../../shared/enums';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { InfrastructureService } from "../../infrastructures/infrastructure.service";

@Component({
  selector: 'ai-station-form',
  templateUrl: './station-form.component.html',
  styleUrls: ['./station-form.component.scss']
})
export class StationFormComponent implements OnInit, AfterViewInit {
  @Output() closeNewSectionForm: EventEmitter<any> = new EventEmitter<any>();
  @Output() stationUpdated: EventEmitter<any> = new EventEmitter<any>();

  @Input() infrastructure: Infrastructure;
  @Input() station: any;

  @ViewChild('driveUploader') driveUploader: DriveUploaderComponent;
  @ViewChild('driveCoverUploader') driveCoverUploader: DriveUploaderComponent;

  stationForm: FormGroup;
  loading: boolean = false;
  newStationMode: boolean = false;
  allowedMimeType = [
    'image/png',
  ];
  allowedCoverMimeType = [
    'image/png',
    'image/jpeg',
    'image/jpg',
  ];
  currentOrganization: any;
  serviceKey = {
    _id: 'SMART_INFRASTRUCTURE',
    key: ``
  };
  layoutImage: FileModel;
  coverImage: FileModel;
  controllers: Device[];
  changedFields = 0;
  infrastructure$: Observable<Infrastructure>;
  infrastructureId: string;
  infraName$: Observable<Infrastructure>;
  isTypeAllowed: any;
  cyrillicPattern = '^([A-Za-z0-9.,(/\\\\/)-/\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff\\s]*)$';
  validationState: any = {};
  submitted: boolean = false;
  billingForm: FormGroup;
  // Temporary variables for Billing User Status (Pay or Not)
  // TODO: Get real status for free seats
  userNeedToPay = false; // Hardcoded

  private FIELD_NAMES = {
    name: 'name',
    payRate: 'payRate',
    pixelScale: 'pixelScale',
    controller: 'controller',
    controllerSerialNumber: 'controllerSerialNumber',
    controllerName: 'controllerName'
  };

  constructor(private fb: FormBuilder,
              private authService: AuthService,
              private router: Router,
              private route: ActivatedRoute,
              private infrastructureService: InfrastructureService,
              private infrastructureRestService: InfrastructureRestService,
              private stationsRestService: StationsRestService,
              private toastrService: ToastrService) {
    this.authService.activeOrganization.subscribe((org: any) => {
      this.currentOrganization = org;

      this.serviceKey = {
        _id: 'SMART_INFRASTRUCTURE',
        key: this.currentOrganization ? `${this.currentOrganization._id}` : 'PERSONAL'
      };
    });
  }

  ngOnInit(): void {
    this.getControllers();
    this.buildForm();

    if (this.station) {
      this.coverImage = this.station.coverImage;
      this.layoutImage = this.station.layoutImage;      
    }

    this.infrastructure$ = this.infrastructureService.infrastructureId
      .pipe(tap(id => this.infrastructureId = id),
        switchMap(id => this.infrastructureRestService.getById(id)));
  }

  ngAfterViewInit() {
    if (this.userNeedToPay && !this.station) {
      this.buildBillingForm();
    }
  }

  buildBillingForm() {
    this.billingForm = this.fb.group({
      accountId: ['', Validators.required],
      agreeTerms: [false, Validators.requiredTrue]
    });
  }

  buildForm() {
    this.stationForm = this.fb.group({
      name: [
        this.station?.name || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(40),
          this.emptySpaceValidator,
          Validators.pattern(this.cyrillicPattern)
        ]
      ],
      payRate: [this.station?.payRate || '', Validators.required],
      pixelScale: [{ value: this.station?.pixelScale || '', disabled: this.station && this.station.floor }],
      controller: [this.station?.controller ? this.station?.controller[0] : null],
      controllerSerialNumber: [''],
      controllerName: ['']
    });

    if (this.station) {
      this.stationForm.valueChanges.subscribe(data => {
        this.countChangedFields();
      });
    }

    this.stationForm.get('controller').valueChanges.subscribe(() => {
      this.newStationMode = false;
      this.stationForm.get('controllerSerialNumber').setValue('');
      this.stationForm.get('controllerName').setValue('');
    });

    this.initValidationState();
  }

  getControllers() {
    this.infrastructureRestService.searchDevices({ infrastructure: this.infrastructure._id }).subscribe((devices: Device[]) => {
      this.loading = false;
      this.controllers = devices.filter(device => {
        return !device.station && (device.canBeController || device.type.name === 'AOS_DEVICE');
      });
    });
  }

  closeNewStationForm() {
    this.closeNewSectionForm.emit(true);
  }

  onSuccessUpload(event: any) {
    if (this.isTypeAllowed) {
      this.layoutImage = {
        signedUrl: event.signedUrl,
        name: event.name,
        contentType: event.contentType
      } as FileModel;

      if (this.station) {
        this.countChangedFields();
      }

      this.setScaleFieldAsRequired();
    } else {
      return this.toastrService.error('This format is not supported');
    }
  }

  onSuccessCoverUpload(event: any) {
    if (this.isTypeAllowed) {
      this.coverImage = {
        signedUrl: event.signedUrl,
        name: event.name,
        contentType: event.contentType
      } as FileModel;
      if (this.station) {
        this.countChangedFields();
      }
    } else {
      return this.toastrService.error('This format is not supported');
    }
  }

  onAddNewStation(event: Event) {
    event.preventDefault();
    this.newStationMode = true;
    this.stationForm.get('controller').setValue(null, { emitEvent: false });
  }

  onSubmit() {
    this.submitted = true;
    const formValue = this.stationForm.value;

    this.validateForm();

    if (this.stationForm.invalid) {
      return;
    }

    this.loading = true;

    if (this.station) {
      const updatedStation = this.getChangedFields(formValue);

      this.stationsRestService.update(this.station._id, updatedStation).subscribe(station => {
        this.stationUpdated.emit(station);
        this.toastrService.success('Station successfully Updated!');
        this.closeNewStationForm();
      }, (err: any) => {
        this.toastrService.error(err.error.message || err);
      });
    } else {
      const station = {
        ...formValue,
        coverImage: this.coverImage,
        layoutImage: this.layoutImage,
        type: StationType.WORK,
        infrastructure: this.infrastructure._id,
        parentSystem: this.infrastructure.system
      } as StationModel;

      this.stationsRestService.create(station).subscribe((result: StationModel) => {
          this.toastrService.success('Successfully created!');
          this.router.navigate([result._id], { relativeTo: this.route });
          this.loading = false;
        },
        (err: any) => {
          this.toastrService.error(err.error.message || err);
        });
    }
  }

  countChangedFields() {
    this.changedFields = Object.keys(this.getChangedFields(this.stationForm.value)).length;
  }

  private getChangedFields(formValue): any {
    const fieldsToUpdate = [
      'name',
      'payRate',
      'pixelScale',
      'coverImage',
      'layoutImage'
    ];
    let changedField = {} as any;

    fieldsToUpdate.map(field => {
      if (field === 'coverImage' || field === 'layoutImage') {
        if (
          (this.station[field]?.signedUrl !== this.coverImage?.signedUrl) ||
          (this.station[field]?.signedUrl !== this.layoutImage?.signedUrl)
        ) {
          changedField[field] = field === 'coverImage' ? this.coverImage : this.layoutImage;
        }
      }
      if ((this.station[field] !== formValue[field]) && formValue[field] !== undefined) {
        changedField[field] = formValue[field];
      }
    });

    return changedField;
  }

  private emptySpaceValidator(c: FormControl) {
    return c.value.replace(/\s/g, '').length ? null : {
      spaceValidator: {
        valid: false
      }
    };
  }

  private initValidationState(): void {
    let controls = this.stationForm.controls;

    Object.entries(controls).forEach(control => this.addValidationStateItems(...control));
  }

  private addValidationStateItems(formGroupName: string, formGroup: any): void {
    this.validationState[formGroupName] = {
      isValid: true,
      message: ''
    };

    formGroup.valueChanges.subscribe(val => this.resetErrorState(formGroupName));
  }

  private resetErrorState(fieldName): void {
    this.validationState[fieldName].isValid = true;
    this.validationState[fieldName].message = '';

    if (this.submitted) {
      this.submitted = false;
    }
  }

  private validateForm() {
    const fieldNames = Object.keys(this.FIELD_NAMES);

    fieldNames.forEach(fieldName => {
      let control = this.stationForm.get(this.FIELD_NAMES[fieldName]);

      if (control.invalid) {
        this.validationState[fieldName].isValid = false;
        this.validationState[fieldName].message = this.getErrorMessage(fieldName, control);
      }
    });
  }

  private getErrorMessage(fieldName: string, control: AbstractControl): string {
    const isName = fieldName.toLowerCase().includes('name');
    let errorMessage = '';

    if (isName) {
      errorMessage = this.getNameErrorMessage();
    } else {
      errorMessage = this.getCommonErrorMessage(fieldName, control);
    }

    return errorMessage;
  }

  private getNameErrorMessage(): string {
    const entity = 'Station name';
    let control = this.stationForm.get('name');
    let errorMessage = '';

    if (control.hasError('required')) {
      errorMessage = `${entity} is required`;
    } else if (control.hasError('minlength')) {
      errorMessage = `${entity} should contain at least 2 characters`;
    } else if (control.hasError('maxlength')) {
      errorMessage = `${entity} cannot be more than 40 characters`;
    } else if (control.hasError('pattern')) {
      errorMessage = `${entity} should contain only latin characters or digits`;
    }

    return errorMessage;
  }

  private getCommonErrorMessage(fieldName: string, control: AbstractControl): string {
    const correctFieldName = this.getCorrectFieldName(fieldName);
    let errorMessage = '';

    if (control.hasError('required')) {
      errorMessage = `${correctFieldName} is required`;
    } else if (control.hasError('pattern')) {
      errorMessage = `${correctFieldName} is invalid`;
    }

    return errorMessage;
  }

  private getCorrectFieldName(fieldName: string): string {
    let correctFieldName = 'Field';

    if (fieldName === 'pixelScale') {
      correctFieldName = 'Image scale';
    }
    return correctFieldName;
  }

  private setScaleFieldAsRequired(): void {
    this.stationForm.get('pixelScale').setValidators(Validators.required);
    this.stationForm.get('pixelScale').updateValueAndValidity();
  }

  onAfterAddingFile(e: any, type: string) {
    const types = type === 'layout' ? this.allowedMimeType : this.allowedCoverMimeType;
    this.isTypeAllowed = types.find(type => type === e.file?.type);
  }

  validatePaymentFormData(data: {accountId: string; agreeTerms: boolean}) {
    this.billingForm.get('accountId').patchValue(data.accountId);
    this.billingForm.get('agreeTerms').patchValue(data.agreeTerms);
  }
}
