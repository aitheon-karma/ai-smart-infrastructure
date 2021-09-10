import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { SocketMetadata } from '@aitheon/system-graph';
import { ToastrService } from 'ngx-toastr';
import { PricingType } from '../../interfaces/pricing-type.interface';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DriveUploaderComponent, AuthService } from '@aitheon/core-client';
import { FileItem } from '@aitheon/creators-studio';
import { CategoriesRestService, StoreRequestForm, StoreRequestsRestService } from '@aitheon/marketplace';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { FileUploader, FileItem as NgFileItem } from 'ng2-file-upload';
import { ModalService } from '@aitheon/core-client';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

enum Tab {
  INFORMATION = 'INFORMATION',
  CUSTOMIZATION = 'CUSTOMIZATION',
  INPUTS_AND_OUTPUTS = 'INPUTS_AND_OUTPUTS'
}

@Component({
  selector: 'ai-request-modal',
  templateUrl: './request-modal.component.html',
  styleUrls: ['./request-modal.component.scss']
})
export class RequestModalComponent implements OnInit, OnDestroy {

  @ViewChild('driveUploader') driveUploader: DriveUploaderComponent;
  @ViewChild('driveAvatarUploader') driveAvatarUploader: DriveUploaderComponent;
  @ViewChild('driveLogoUploader') driveLogoUploader: DriveUploaderComponent;
  @ViewChild('requestModal') requestModal: TemplateRef<any>;

  tabs: {
    label: string,
    key: Tab.INFORMATION | Tab.CUSTOMIZATION | Tab.INPUTS_AND_OUTPUTS,
  }[];
  activeTab: Tab.INFORMATION | Tab.CUSTOMIZATION | Tab.INPUTS_AND_OUTPUTS = Tab.INFORMATION;
  request: any;
  modalType = 'REQUEST_MODAL';
  submitted: boolean;
  tabTypes = Tab;
  itemImageFile: FileItem = new FileItem();
  itemImageFiles: FileItem[] = [];
  itemImages: any = [];
  imageLoading = false;
  itemAvatarImageFile: FileItem;
  itemLogoImageFile: FileItem;
  imageAvatarLoading = false;
  imageLogoLoading = false;
  pricingType = PricingType;
  categories: any[] = [];
  currentOrganization: any;
  serviceKey = {
    _id: 'MARKETPLACE',
    key: ``
  };
  appStoreForm: FormGroup;
  nodeStylingForm: FormGroup;
  requestModalRef: BsModalRef;
  node = {
    inputs: [],
    outputs: [],
    type: 'TEMPLATE_NODE',
  } as any;
  loading = false;
  subscriptions: Subscription[] = [];
  disabled: boolean;
  storeRequest: StoreRequestForm;
  viewedTabs = [] as string[];
  showSkipMessage = true;
  allowedMimeType = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg'
  ];
  urlPreview: string;
  currencyMask = /^[0-9]{1,3}([,.][0-9]{1,2})?$/;
  urlMask = new RegExp(/^(\S*\s){0}[a-z0-9-]\S*$/);
  mask = new RegExp(/^(\S*\s){0,9}[a-zA-Z0-9_.-\s]\S*$/);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private categoriesRestService: CategoriesRestService,
    private bsModalService: BsModalService,
    private toastrService: ToastrService,
    private modalService: ModalService,
    private storeRequestsRestService: StoreRequestsRestService
  ) {
    this.authService.activeOrganization.subscribe((org: any) => {
      this.currentOrganization = org;
      if (!environment.production) {
        this.storeRequestsRestService.defaultHeaders = this.storeRequestsRestService
          .defaultHeaders.set('organization-id', org._id);
      }
      this.serviceKey = {
        _id: 'MARKETPLACE',
        key: this.currentOrganization ? `${this.currentOrganization._id}` : 'PERSONAL'
      };
    });
  }

  ngOnInit() {
    this.subscriptions.push(this.modalService.openModal$.subscribe(({ type, data }) => {
      if (type === this.modalType) {

        if (data) {
          const nodeStyling = data.initial.nodeStyling;
          this.storeRequest = { ...data.initial, ...data } as any;
          this.node = {
            nodeStyling,
            inputs: this.storeRequest.inputs,
            outputs: this.storeRequest.outputs,
          }
        }
        this.show();
        this.loadCategories();
      }
    }));
  }

  private buildMarketplaceRequestForm() {
    this.urlPreview = '';
    this.appStoreForm = this.fb.group({
      titleImage: [null, [Validators.required]],
      name: [null, [Validators.required, Validators.pattern(this.mask)]],
      urlName: [null, [Validators.required, Validators.pattern(this.urlMask)]],
      description: [null, [Validators.required]],
      pricingType: [PricingType.ONE_TIME, []],
      price: [null, [Validators.required, Validators.pattern(this.currencyMask)]],
      category: ['5f30f9fe5b95430012aa40c2', [Validators.required]],
    });

    this.subscriptions.push(this.appStoreForm.valueChanges.subscribe(newValue => {
      this.storeRequest = { ...this.storeRequest, ...newValue };
      this.node.name = this.storeRequest.name;
    }));

    if (this.disabled) {
      this.appStoreForm.disable();
    }

    this.appStoreForm.valueChanges.subscribe(form => {
      if (form.urlName === ' ') {
        this.trimValue('urlName');
      }

      if (form.name === ' ') {
        this.trimValue('name');
      }

      if (form.description === ' ') {
        this.trimValue('description');
      }

      this.urlPreview = form.urlName;
    });
  }

  private buildNodeStylingForm() {
    this.nodeStylingForm = this.fb.group({
      backgroundColor: [''],
      borderColor: [''],
      logo: [undefined],
    });

    if (this.disabled) {
      this.nodeStylingForm.disable();
    }

    this.subscriptions.push(this.nodeStylingForm.valueChanges.subscribe(newValue => {
      this.storeRequest = {
        ...this.storeRequest,
        nodeStyling: {
          ...(this.storeRequest && this.storeRequest.nodeStyling || {}),
          ...newValue,
        }
      };
      this.node = {
        ...this.node,
        ...this.storeRequest,
      };
    }));
  }

  loadCategories() {
    this.subscriptions.push(this.categoriesRestService.list('APP').subscribe((categories: any[]) => {
      this.categories = categories;
    }));
  }

  onSuccessUpload(event: any) {
    this.itemImageFile = new FileItem();
    this.itemImages.push(event.signedUrl);
    this.itemImageFile._id = event._id;
    this.itemImageFile.filename = event.name;
    this.itemImageFile.mimetype = event.contentType;
    this.itemImageFile.url = event.signedUrl;
    this.itemImageFiles.push(this.itemImageFile);
    this.imageLoading = true;
    const images = this.storeRequest.images || [];
    this.storeRequest = { ...this.storeRequest, images: [...images, this.itemImageFile] };
  }

  onSuccessAvatarUpload(event: any) {
    this.itemAvatarImageFile = new FileItem();
    this.itemAvatarImageFile._id = event._id;
    this.itemAvatarImageFile.filename = event.name;
    this.itemAvatarImageFile.mimetype = event.contentType;
    this.itemAvatarImageFile.url = event.signedUrl;
    this.imageAvatarLoading = true;
    this.storeRequest = { ...this.storeRequest, titleImage: this.itemAvatarImageFile };
    this.appStoreForm.get('titleImage').setValue(this.itemAvatarImageFile);
  }

  onSuccessLogoUpload(event: any) {
    this.itemLogoImageFile = new FileItem();
    this.itemLogoImageFile._id = event._id;
    this.itemLogoImageFile.filename = event.name;
    this.itemLogoImageFile.mimetype = event.contentType;
    this.itemLogoImageFile.url = event.signedUrl;
    this.imageLogoLoading = true;
    this.storeRequest = { ...this.storeRequest };
    this.storeRequest.nodeStyling = { ...this.storeRequest.nodeStyling, logo: this.itemLogoImageFile };
    this.nodeStylingForm.get('logo').setValue(this.itemLogoImageFile);
  }

  closeModal(event?: Event) {
    if (event) {
      this.stopEvent(event);
    }
    this.requestModalRef.hide();
    this.buildMarketplaceRequestForm();
    this.buildNodeStylingForm();
    this.submitted = false;
    this.viewedTabs = [];
    this.showSkipMessage = true;
    this.storeRequest = new StoreRequestForm;
  }

  show() {
    this.loading = true;
    this.activeTab = this.tabTypes.INFORMATION;

    this.createTabs();
    this.buildMarketplaceRequestForm();
    this.buildNodeStylingForm();
    this.loading = false;

    this.requestModalRef = this.bsModalService.show(this.requestModal,
      Object.assign({}, { class: 'custom-modal custom-modal--medium' })
    );
  }

  createTabs() {
    this.tabs = Object.keys(Tab).map((tab, i) => ({
      label: `${i + 1} ${tab.split('_')
        .map((item, itemIndex) => ((itemIndex === 0 ? item.substring(0, 1)
          : item.substring(0, 1).toLowerCase()) + item.substring(1).toLowerCase())).join(' ')}`,
      key: tab as any,
    }));
  }

  switchTab(tab: Tab.INFORMATION | Tab.CUSTOMIZATION | Tab.INPUTS_AND_OUTPUTS, event?: Event) {
    if (event) {
      this.stopEvent(event);
    }
    this.viewedTabs.push(tab);
    this.activeTab = tab;
  }

  switchToNextTab(event: Event) {
    this.stopEvent(event);

    switch (this.activeTab) {
      case Tab.INFORMATION:
        this.viewedTabs.push(Tab.CUSTOMIZATION);
        this.activeTab = Tab.CUSTOMIZATION;
        break;
      case Tab.CUSTOMIZATION:
        this.activeTab = Tab.INPUTS_AND_OUTPUTS;
        this.viewedTabs.push(Tab.INPUTS_AND_OUTPUTS);
        break;
      case Tab.INPUTS_AND_OUTPUTS:
        this.activeTab = Tab.INFORMATION;
        break;
      default:
        this.activeTab = Tab.INFORMATION;
    }
  }

  itemAvatarImageRemove() {
    delete this.storeRequest.titleImage;
    this.appStoreForm.get('titleImage').reset();
    this.storeRequest = { ...this.storeRequest };
  }

  removeScreenshot(i: number) {
    this.storeRequest.images.splice(i, 1);
    this.storeRequest = { ...this.storeRequest };
  }

  removeLogo(event: Event) {
    this.stopEvent(event);
    delete this.storeRequest.nodeStyling.logo;
    this.nodeStylingForm.get('logo').reset();
    this.storeRequest = { ...this.storeRequest };
  }

  addIoToNode(data: {
    inputs?: SocketMetadata[],
    outputs?: SocketMetadata[],
  }): void {
    this.node = {
      ...this.node,
      ...data,
    };
  }

  findLatestNode(nodes: any[]) {
    return nodes.reduce((result, current) => {
      if (!result) {
        return current;
      }
      if (Number(new Date(current.createdAt)) > Number(new Date(result.createdAt))) {
        return current;
      }
      return result;
    });
  }

  closeSkipMessage(event: Event) {
    this.stopEvent(event);
    this.showSkipMessage = false;
  }

  stopEvent(event: Event) {
    event.stopPropagation();
    event.preventDefault();
  }

  saveStoreRequest(event: Event) {
    this.stopEvent(event);
    this.submitted = true;

    if (this.appStoreForm.invalid) {
      this.switchTab(this.tabTypes.INFORMATION);
      return;
    }

    if (this.disabled || this.nodeStylingForm.invalid) {
      return;
    }

    const storeRequest = {
      ...this.storeRequest,
      type: 'EMPTY',
      images: this.storeRequest.images || [],
      inputs: this.node && this.node.inputs ? this.node.inputs : [],
      outputs: this.node && this.node.outputs ? this.node.outputs : [],
    } as StoreRequestForm;

    this.loading = true;
    this.storeRequestsRestService.create(storeRequest).subscribe((request) => {
      this.toastrService.success('Request successfully created');
      this.closeModal();
      this.loading = false;
    }, (error: Error) => {
      this.toastrService.error(error.message || 'Unable to create request');
    });
  }

  trimValue(type: any) {
    this.appStoreForm.get(type).patchValue(this.appStoreForm.get(type).value.trim());
  }

  onAfterAddingFile(fileItem: NgFileItem, uploader: FileUploader) {
    const isAllowedMimeType = this.allowedMimeType.includes(fileItem.file.type);
    if (!isAllowedMimeType) {
      uploader.removeFromQueue(fileItem);
      return this.toastrService.error(`File type "${fileItem.file.type}" is not valid`);
    }
    uploader.uploadAll();
  }

  ngOnDestroy(): void {
    try {
      for (const subscription of this.subscriptions) {
        subscription.unsubscribe();
      }
    } catch (e) {
    }
  }
}
