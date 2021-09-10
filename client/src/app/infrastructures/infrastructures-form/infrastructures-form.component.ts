import { OrganizationsService } from '../../shared/services/organizations.service';
import { tap } from 'rxjs/operators';
import { ItemRestService } from '@aitheon/item-manager';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup, FormControl, AbstractControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { AuthService, DriveUploaderComponent, ModalService } from '@aitheon/core-client';
import { InfrastructureRestService, Infrastructure } from '@aitheon/smart-infrastructure';
import { InfrastructureType, InfrastructureStatus } from '../../shared/enums';
import { Subscription } from 'rxjs';
import { InfrastructureService } from '../infrastructure.service';

@Component({
  selector: 'ai-infrastructures-form',
  templateUrl: './infrastructures-form.component.html',
  styleUrls: ['./infrastructures-form.component.scss']
})
export class InfrastructuresFormComponent implements OnInit, AfterViewInit {

  @ViewChild('driveUploader') driveUploader: DriveUploaderComponent;
  @ViewChild('nameInput') nameInput: ElementRef;

  newForm: FormGroup;
  orgForm: FormGroup;
  submitted = false;
  infrastructureData: any;
  checkbox = 'NEW';
  ghostFocus = false;
  options = [];
  locationTypeOptions = this.getCapitalizedItems(Object.keys(InfrastructureType));
  currentOrganization: any;
  currentLocation: any;
  serviceKey: { _id: string; key: string };
  logo: any;
  isEdit = false;
  loading = false;
  subscriptions: Subscription[] = [];
  infrastructureId: string;
  isUseOrganizationCoverEnabled = false;
  items: any[];
  organizationId: string;
  cyrillicPattern = '^([A-Za-z0-9(/\\\\/)-/\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff\\s]*)$';
  cyrillicPatternWithoutDigits = '^([A-Za-z(/\\\\/)-/\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff\\s]*)$';
  validationState: any = {};
  fromOrgValidationState: any = {};
  billingForm: FormGroup;
  // Temporary variables for Billing User Status (Pay or Not)
  // TODO: Get real status for free seats
  userNeedToPay = false; // Hardcoded

  private FIELD_NAMES = {
    name: 'name',
    type: 'type',
    locationName: 'address.locationName',
    addressLine1: 'address.addressLine1',
    addressLine2: 'address.addressLine2',
    city: 'address.city',
    regionState: 'address.regionState',
    country: 'address.country',
    code: 'address.code'
  };

  private FROM_ORG_FIELD_NAMES = {
    name: 'name',
    type: 'type',
    location: 'location'
  };

  constructor(
    private fb: FormBuilder,
    private infrastructureRestService: InfrastructureRestService,
    private toastr: ToastrService,
    private router: Router,
    private infrastructureService: InfrastructureService,
    private authService: AuthService,
    private itemRestService: ItemRestService,
    private organizationsService: OrganizationsService,
    private modalService: ModalService,
  ) {
  }

  ngOnInit() {
    this.getActiveOrg();
    this.buildForm();
    this.buildFromOrgForm();
  }

  ngAfterViewInit() {
    if (this.nameInput) {
      this.nameInput.nativeElement.focus();

      // to fix autoscroll on focus in Firefox
      window.scroll(0, 0);
    }
    if (this.userNeedToPay && !this.isEdit) {
      this.buildBillingForm();
    }
  }

  buildBillingForm() {
    this.billingForm = this.fb.group({
      accountId: ['', Validators.required],
      agreeTerms: [false, Validators.requiredTrue]
    });
  }

  getActiveOrg() {
    this.loading = true;
    this.subscriptions.push(this.authService.activeOrganization.subscribe((organization: any) => {
      this.currentOrganization = organization;
      if (this.currentOrganization.locations.length > 0) {
        this.options = this.currentOrganization.locations;
      }
      this.serviceKey = {
        _id: 'SMART_INFRASTRUCTURE',
        key: `${this.currentOrganization._id}`
      };
      this.subscriptions.push(this.infrastructureService.infrastructureId.subscribe((id) => {
        this.infrastructureId = id;
        if (id) {
          this.isEdit = true;
          this.getInfrastructureDetails(id);
        } else {
          this.isEdit = false;
          this.loading = false;
        }
      }));
    }));

    this.organizationsService.currentOrganization$.pipe(tap(() => {
      this.organizationsService.setHeaders(this.itemRestService);
    })).subscribe(() => {
      this.itemRestService.list('GOODS').subscribe(items => {
        this.items = items;
      });
    });
  }

  buildForm(): void {
    this.newForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(40),
          this.emptySpaceValidator,
          Validators.pattern(this.cyrillicPattern)
        ]
      ],
      type: [null, Validators.required],
      address: this.fb.group({
        locationName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(40),
            this.emptySpaceValidator,
            Validators.pattern(this.cyrillicPattern)
          ]
        ],
        addressLine1: ['', [
          Validators.required,
          Validators.pattern(this.cyrillicPattern)
        ]],
        addressLine2: [''],
        city: ['', [
          Validators.required,
          Validators.pattern(this.cyrillicPatternWithoutDigits)
        ]],
        regionState: ['', [
          Validators.required,
          Validators.pattern(this.cyrillicPatternWithoutDigits)
        ]],
        country: ['', [
          Validators.required,
          Validators.pattern(this.cyrillicPatternWithoutDigits)
        ]],
        code: ['', Validators.required]
      }),
      items: null
    });

    this.initValidationState();
  }

  buildFromOrgForm(): void {
    this.orgForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(40),
          this.emptySpaceValidator,
          Validators.pattern(this.cyrillicPattern)
        ]
      ],
      location: [null, [Validators.required]],
      type: [null, [Validators.required, Validators.pattern(this.cyrillicPattern)]],
      items: null
    });

    this.subscriptions.push(
      this.orgForm.get('location').valueChanges
        .subscribe(newVal => {
          this.currentLocation = newVal;

          this.updateInfrastructureCover();
        })
    );
  }

  patchForm() {
    this.newForm.patchValue({
      name: this.infrastructureData.name,
      type: this.infrastructureData.type ? this.infrastructureData.type : '',
      items: this.infrastructureData.items ? this.infrastructureData.items.map(item => item._id) : [],
      address: {
        locationName: this.infrastructureData.location
          ? this.infrastructureData.location.name
          : '',
        addressLine1: this.infrastructureData.location
          ? this.infrastructureData.location.address.addressLine1
          : '',
        addressLine2: this.infrastructureData.location
          ? this.infrastructureData.location.address.addressLine2
          : '',
        city: this.infrastructureData.location
          ? this.infrastructureData.location.address.city
          : '',
        regionState: this.infrastructureData.location
          ? this.infrastructureData.location.address.country
          : '',
        country: this.infrastructureData.location
          ? this.infrastructureData.location.address.country
          : '',
        code: this.infrastructureData.location
          ? this.infrastructureData.location.address.code
          : '',
        name: this.infrastructureData.location
          ? this.infrastructureData.location.name
          : ''
      }
    });
  }

  onExistOrgSubmit() {
    this.submitted = true;

    this.validateForm();

    if (this.orgForm.invalid) {
      return;
    }

    const { name, type, location } = this.orgForm.value;
    const data = {
      name,
      type: type.toUpperCase(),
      location: location,
      logo: this.logo
    };

    this.isEdit
      ? this.updateInfrastructure(data)
      : this.createInfrastructure(data);

    localStorage.removeItem('googleMapMarkers');
  }

  onNewOrgSubmit() {
    this.submitted = true;

    this.validateForm();

    if (this.newForm.invalid) {
      return;
    }

    const { name, type, address, items } = this.newForm.value;

    const data = {
      name,
      type: type.toUpperCase(),
      location: {
        address,
        logo: this.isEdit ? this.infrastructureData.location.logo : this.logo,
        emails: [],
        name: address.name,
        phoneNumbers: [],
        faxNumbers: [],
        _id: this.isEdit ? this.infrastructureData.location._id : undefined
      },
      items,
      logo: this.logo
    };

    this.isEdit
      ? this.updateInfrastructure(data)
      : this.createInfrastructure(data);

    localStorage.removeItem('googleMapMarkers');
  }

  createInfrastructure(data: any) {
    this.infrastructureRestService.create(data).subscribe(
      infrastructure => {
        const { name, _id: id } = infrastructure;

        this.toastr.success('Infrastructure created successfully');
        this.navigateToInfrastructure(name, id);
      },
      error => {
        this.toastr.error('Failed to create an Infrastructure');
      }
    );
  }

  updateInfrastructure(data: any) {
    this.infrastructureRestService
      .update(this.infrastructureData._id, data)
      .subscribe(
        response => {
          this.toastr.success('Infrastructure updated successfully');
          this.router.navigate([`/infrastructure/${this.infrastructureId}/dashboard`]);
        },
        error => {
          this.toastr.error('Failed to update an Infrastructure');
        }
      );
  }

  ghostInputFocus() {
    this.ghostFocus = !this.ghostFocus;
  }

  changeInfrastructure(type: string) {
    this.checkbox = type;

    this.updateCommonFields(this.checkbox);

    this.initValidationState();
  }

  failedUpload(event: any) {
    this.toastr.error('File upload failed');
  }

  onAfterAdd(event) {
    let sizeNotAllowed = false;
    let typeNotAllowed = false;
    let errorMessage = '';
    if (!(event.file.size / 1000 / 1000 < 3)) {
      sizeNotAllowed = true;
      errorMessage = 'File size limit exceeded, should be less than 3 MB.';
    }
    if (!event.file.type.match('image.*')) {
      typeNotAllowed = true;
      errorMessage = 'File type unknown, only JPG/PNG allowed.';
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

  getInfrastructureDetails(infrastructureId: string) {
    this.loading = true;

    this.subscriptions.push(
      this.infrastructureRestService.list(null, true)
        .subscribe((infrastructures: Array<any>) => {
          this.infrastructureData = infrastructures.find(infrastructure => infrastructure._id === infrastructureId);
          this.logo = this.infrastructureData.logo || null;
          this.loading = false;
          this.patchForm();
        })
    );
  }

  onArchiveClick() {
    this.modalService.openGenericConfirm({
      text: `You are sure that you want to archive this infrastructure?`,
      headlineText: `Archive Infrastructure`,
      confirmText: `Archive`,
      creationConfirm: true,
      callback: (confirm) => {
        if (confirm) {
          this.archive();
        }
      }
    });
  }

  public changeCoverSettings(type: string): void {
    this.isUseOrganizationCoverEnabled = type === 'ORG_COVER';

    this.updateInfrastructureCover();
  }

  private archive(): void {
    if (!this.infrastructureId) {
      return;
    }

    this.subscriptions.push(
      this.infrastructureRestService.archive(this.infrastructureId)
        .subscribe(() => {
          this.toastr.success('Successfully archived');
          this.router.navigate(['/dashboard']);
        })
    );

    localStorage.removeItem('googleMapMarkers');
  }

  private updateInfrastructureCover(): void {
    if (this.isUseOrganizationCoverEnabled) {
      this.logo = this.currentLocation ? this.currentLocation.logo : null;
    } else {
      this.logo = null;
    }
  }

  private navigateToInfrastructure(name: string, id: string): void {
    localStorage.setItem('infrastructure', JSON.stringify({ name, Id: id }));

    this.router.navigate([`/infrastructure/${id}/dashboard`]);
  }

  private updateCommonFields(type: string): void {
    if (type === 'NEW') {
      this.newForm.patchValue({
        name: this.orgForm.get('name').value,
        type: this.orgForm.get('type').value
      });
    } else {
      this.orgForm.patchValue({
        name: this.newForm.get('name').value,
        type: this.newForm.get('type').value
      });
    }
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) {
      try {
        subscription.unsubscribe();
      } catch (e) {
      }
    }
  }

  backToInfra(): void {
    const url = this.infrastructureId ? `/infrastructure/${this.infrastructureId}/dashboard` : '/dashboard';
    this.router.navigate([url]);
  }

  emptySpaceValidator(c: FormControl) {
    return c?.value?.replace(/\s/g, '').length ? null : {
      spaceValidator: {
        valid: false
      }
    };
  }

  private getCapitalizedItems(items: Array<string>): Array<string> {
    return items.map(item => {
      return item.charAt(0) + item.slice(1).toLowerCase();
    });
  }

  private initValidationState(): void {
    let controls = this.checkbox === 'NEW' ? this.newForm.controls : this.orgForm.controls;

    Object.entries(controls).forEach(control => this.addValidationStateItems(...control));
  }

  private addValidationStateItems(formGroupName: string, formGroup: any): void {
    const hasNestedControls = !!formGroup.controls;

    if (hasNestedControls) {
      let controls = Object.entries(formGroup.controls).forEach(control => this.addValidationStateItems(...control));
    } else {
      if (this.checkbox === 'NEW') {
        this.validationState[formGroupName] = {
          isValid: true,
          message: ''
        };
      } else {
        this.fromOrgValidationState[formGroupName] = {
          isValid: true,
          message: ''
        };
      }

      formGroup.valueChanges.subscribe(val => this.resetErrorState(formGroupName));
    }
  }

  private validateForm() {
    const fieldNames = (this.checkbox === 'NEW') ? Object.keys(this.FIELD_NAMES) : Object.keys(this.FROM_ORG_FIELD_NAMES);

    fieldNames.forEach(fieldName => {
      const currentFiledNames = (this.checkbox === 'NEW') ? this.FIELD_NAMES : this.FROM_ORG_FIELD_NAMES;
      let currentForm = (this.checkbox === 'NEW') ? this.newForm : this.orgForm;
      let control = currentForm.get(currentFiledNames[fieldName]);
      let currentValidationState = (this.checkbox === 'NEW') ? this.validationState : this.fromOrgValidationState;

      if (control.invalid) {
        currentValidationState[fieldName].isValid = false;
        currentValidationState[fieldName].message = this.getErrorMessage(fieldName, control);
      }
    });
  }

  private getErrorMessage(fieldName: string, control: AbstractControl): string {
    const isName = fieldName.toLowerCase().includes('name');
    let errorMessage = '';

    if (isName) {
      errorMessage = this.getNameErrorMessage(fieldName, control);
    } else {
      errorMessage = this.getCommonErrorMessage(fieldName, control);
    }

    return errorMessage;
  }

  private getNameErrorMessage(fieldName: string, control: AbstractControl): string {
    const entity = fieldName === 'locationName' ? 'Location' : 'Infrastructure';
    let errorMessage = '';

    if (control.hasError('required')) {
      errorMessage = `${entity} name is required`;
    } else if (control.hasError('minlength')) {
      errorMessage = `${entity} name should contain at least 2 characters`;
    } else if (control.hasError('maxlength')) {
      errorMessage = `${entity} name cannot be more than 40 characters`;
    } else if (control.hasError('pattern')) {
      errorMessage = `${entity} name should contain only latin characters or digits`;
    }

    return errorMessage;
  }

  private getCommonErrorMessage(fieldName: string, control: AbstractControl): string {
    const correctFieldName = this.getCorrectFieldName(fieldName);
    const isAddress = fieldName.toLowerCase().includes('address');
    let errorMessage = '';

    if (control.hasError('required')) {
      errorMessage = `${correctFieldName} is required`;
    } else if (control.hasError('pattern')) {
      errorMessage = `${correctFieldName} should contain only latin characters` + ` ${isAddress ? 'or digits' : ''}`;
    }

    return errorMessage;
  }

  private getCorrectFieldName(fieldName: string): string {
    let correctFieldName = 'Field';

    switch (fieldName) {
      case 'type':
        correctFieldName = 'Type';
        return correctFieldName;
      case 'addressLine1':
        correctFieldName = 'Address line 1';
        return correctFieldName;
      case 'addressLine2':
        correctFieldName = 'Address line 2';
        return correctFieldName;
      case 'city':
        correctFieldName = 'City';
        return correctFieldName;
      case 'regionState':
        correctFieldName = 'Region state';
        return correctFieldName;
      case 'country':
        correctFieldName = 'Country';
        return correctFieldName;
      case 'code':
        correctFieldName = 'Postal code';
        return correctFieldName;
      case 'location':
        correctFieldName = 'Location';
        return correctFieldName;
    }
  }

  private resetErrorState(fieldName): void {
    if (this.checkbox === 'NEW') {
      this.validationState[fieldName].isValid = true;
      this.validationState[fieldName].message = '';
    } else {
      this.fromOrgValidationState[fieldName].isValid = true;
      this.fromOrgValidationState[fieldName].message = '';
    }

    if (!!this.submitted) {
      this.submitted = false;
    }
  }

  validatePaymentFormData(data: {accountId: string; agreeTerms: boolean}) {
    this.billingForm.get('accountId').patchValue(data.accountId);
    this.billingForm.get('agreeTerms').patchValue(data.agreeTerms);
  }

  onDeleteInfrastructure() {
    this.modalService.openGenericConfirm({
      text: `Are you sure you want to delete infrastructure? All devices linked to the infrastructure will be deleted.`,
      headlineText: 'Delete Infrastructure',
      hideNoButton: false,
      creationConfirm: true,
      confirmText: 'Delete', callback: (confirm) => {
        if (confirm) {
          this.deleteInfrastructure();
        }
      }
    });
  }

  deleteInfrastructure() {
    this.loading = true;
    this.subscriptions.push(
      this.infrastructureRestService.remove(this.infrastructureId).subscribe(() => {
        this.loading = false;
        this.router.navigate(['/dashboard']).then(() => {
          this.toastr.success('Infrastructure successfully deleted');
        });
      }, error => {
        console.error(error?.message || error);
        this.toastr.error('Error while deleting Infrastructure');
      })
    );
  }
}
