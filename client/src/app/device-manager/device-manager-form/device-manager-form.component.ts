import {
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InfrastructureRestService, Device, Infrastructure, Floor, AreasRestService, Area, StationsRestService, Station, DeviceSearch } from '@aitheon/smart-infrastructure';
import { DeviceTypesRestService, DeviceType } from '@aitheon/device-manager';
import { InfrastructureService } from '../../infrastructures/infrastructure.service';
import { Subscription, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { StationType, InfrastructureTaskType } from '../../shared/enums';
import { DetectedDevice } from '../../shared/components/autodetect-modal/detected-device';
import { OrganizationsService } from "../../shared/services/organizations.service";
import { DriveUploaderComponent, ModalService } from "@aitheon/core-client";
import * as _ from 'lodash';

@Component({
  selector: "ai-device-manager-form",
  templateUrl: "./device-manager-form.component.html",
  styleUrls: ["./device-manager-form.component.scss"]
})
export class DeviceManagerFormComponent implements OnInit, AfterViewInit {
  @Input() editMode: boolean;
  @Input() device: Device;
  @Output() quitEditMode: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() updateDevice: EventEmitter<Device> = new EventEmitter<Device>();

  @ViewChild('testConnectionButton') testConnectionButton: ElementRef;
  @ViewChild('uploaderInput') uploaderInput: ElementRef;
  @ViewChild('driveUploader') driveUploader: DriveUploaderComponent;
  deviceForm: FormGroup;
  billingForm: FormGroup;
  subscriptions: Subscription[] = [];
  infrastructure: Infrastructure;
  infrastructureId: string;
  deviceFloors: Floor[] = [];
  infrastructureAreas: Area[];
  emptyStation: boolean;
  typesList: Array<{ name: string, value: string }> = [];

  driverSoftwareList = [
    { value: "AITHEON.INTERFACE", name: "AItheon Interface" },
    { value: "AXIS.CAMERA.COMMON", name: "Common AXIS camera" },
    { value: "VR_DEVICE.HTC.VIVE", name: "HTC Vive" },
    { value: "AOS.NVIDIA", name: "AOS Nvidia" }
  ];

  communicationTypeList = [
    // { value: "WIFI", name: "Wi-Fi" },
    { value: "USB", name: "USB Port" },
    // { value: "SERIAL", name: "Serial Port"},
    // { value: "ETHERNET", name: "Ethernet" },
  ];

  protocolTypeList = [
    { value: "SERIAL", name: "USB Serial" },
    { value: "HID", name: "USB HID" },
    { value: "ZPL", name: "Zebra Printer ZPI" },
  ];

  controllersList = [] as Device[];

  defaultTaskList = [
    {
      name: "Go to position",
      value: InfrastructureTaskType.GO_TO
    },
    {
      name: "Go to home charging station",
      value: InfrastructureTaskType.CHARGE
    }
  ];
  isChargingStationFloorSelected = false;
  loading = false;
  areaList = [];
  allChargingStations: Station[];
  chargingStations: Station[];
  chargingStationsFloors: Floor[];
  textConnection = {
    title: 'Test Connection',
    text: '',
    colorStatus: ''
  };
  stationId: string;
  controllerId: string;
  station: any;
  initialFormData: any;
  controllerListSubscription: Subscription;
  selectedController = [];
  payloadWithNotAosDevice: Device;
  notAosDeviceAdded = false;
  isController = false;
  linkedToStation: string;
  deviceImage: any;
  serviceKey: any;
  // Temporary variables for Billing User Status (Pay or Not)
  // TODO: Get real status for free seats
  userNeedToPay = false; // Hardcoded

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private infrastructureService: InfrastructureService,
    private areasRestService: AreasRestService,
    private toastr: ToastrService,
    private infrastructureRestService: InfrastructureRestService,
    private deviceTypesRestService: DeviceTypesRestService,
    private stationsRestService: StationsRestService,
    private modalService: ModalService,
    private organizationsService: OrganizationsService,
  ) {
    this.subscriptions.push(
    this.route.queryParamMap.subscribe(params => {
      this.stationId = params.get('stationId');
      this.controllerId = params.get('controllerId');
      this.linkedToStation = params.get('linkedToStation');
      this.isController = params.get('isController') === 'true';
    }));
  }

  ngOnInit(): void {
    this.loading = true;
    this.subscriptions.push(
      this.deviceTypesRestService.listAll().subscribe((types: DeviceType[]) => {
        this.typesList = types.map((type: DeviceType) => {
          return {
            value: type.name,
            name: this.infrastructureService.humanize(type.name)
          };
        });
        if (this.controllerId) {
          this.typesList = this.typesList.filter(type => type.value !== 'AOS_DEVICE' && type.value !== 'ROBOT');
        }
      })
    );
    this.subscriptions.push(
      this.infrastructureService.infrastructureId.subscribe(id => {
        this.infrastructureId = id;
        this.getInfrastructureData();
        this.getAreasByInfrastructure(id);
        this.getControllers();
      })
    );
    this.subscriptions.push(this.organizationsService.currentOrganization$.subscribe(org => {
      this.serviceKey = {
        _id: 'SMART_INFRASTRUCTURE',
        key: `${org._id}`
      };
    }));

    this.buildForm();

    this.initialFormData = this.formControls;
  }

  ngAfterViewInit() {
    if (this.userNeedToPay && !this.editMode) {
      this.buildBillingForm();
    }
  }

  get formControls() { return this.deviceForm.controls as any; }

  getChargingStations(id) {
    this.subscriptions.push(
      this.stationsRestService.list(id, '', StationType.CHARGING).subscribe((chargingStations: Station[]) => {
        this.allChargingStations = chargingStations;
        let floors = chargingStations.map((station: Station) => this.deviceFloors.find(f => f._id === station.floor));
        this.chargingStationsFloors = this.arrayUnique(floors);
      })
    );
  }

  arrayUnique(arr){
    return arr.filter((e,i,a)=>a.indexOf(e)==i)
  }

  getInfrastructureData() {
    this.subscriptions.push(
      this.infrastructureRestService
        .getById(this.infrastructureId)
        .subscribe((infrastructure: Infrastructure) => {
          this.infrastructure = infrastructure;
          this.deviceFloors = infrastructure.floors || [];
          this.getChargingStations(infrastructure._id);
          this.loading = false;
        })
    );
  }

  buildBillingForm() {
    this.billingForm = this.fb.group({
      accountId: ['', Validators.required],
      agreeTerms: [false, Validators.requiredTrue]
    });
  }

  buildForm() {
    this.deviceForm = this.fb.group({
      name: [this.device?.name || "", [Validators.required, Validators.maxLength(30)]],
      type: [{ value: this.device?.type?.name || null, disabled: this.editMode }, Validators.required],
      serialNumber: [{ value: this.device?.serialNumber || "", disabled: this.editMode }],
      address: [{ value: this.device?.address || "", disabled: this.editMode }],
      port: [{ value: this.device?.port || "", disabled: this.editMode }],
      floor: [{ value: this.device?.floor || null, disabled: this.editMode }],
      chargeStationsFloor: [{ value: null, disabled: this.editMode }],
      chargingStation: [{ value: this.device?.chargingStation || null, disabled: this.editMode }],
      communicationType: [{ value: this.device?.communicationType || null, disabled: this.editMode }],
      controller: [(this.device?.controller && this.device?.controller[0]) || null, { disabled: true }],
      defaultTaskType: [{ value: null, disabled: this.editMode }],
      defaultTaskFloor: [{ value: null, disabled: this.editMode }],
      defaultTaskArea: [{ value: null, disabled: this.editMode }]
    });

    this.setSerialNumberValidation();
    this.setIsCommunicationTypeValidation();

    this.subscriptions.push(
      this.formControls.type.valueChanges.subscribe(field => {
        this.setSerialNumberValidation();
        this.controllerFieldValidation();
        this.setIsCommunicationTypeValidation();
        if (field !== 'AOS_DEVICE' && field !== 'ROBOT') {
          this.deviceForm.get('communicationType').patchValue('USB');
        } else {
          this.deviceForm.get('communicationType').patchValue(null);
        }

        if (field === 'ROBOT' && field.type !== this.initialFormData.type) {
          this.formControls.floor.setValidators([Validators.required]);
        } else {
          this.formControls.defaultTaskType.patchValue(null);
          this.formControls.defaultTaskFloor.patchValue(null);
          this.formControls.defaultTaskArea.patchValue(null);
          this.formControls.floor.setValidators([]);
        }

        this.formControls.floor.setValue(null);
        this.deviceForm.updateValueAndValidity();
      })
    );

    this.subscriptions.push(
      this.formControls.defaultTaskFloor.valueChanges.subscribe(field => {
        this.getAreasByFloor(field);
      })
    );

    this.subscriptions.push(
      this.formControls.controller.valueChanges.subscribe(field => {
        if (field) {
          this.selectedController = this.controllersList.filter(controller => field === controller._id);
        }
      })
    );

    this.subscriptions.push(
      this.formControls.communicationType.valueChanges.subscribe(field => {
        this.setSerialNumberValidation();
      })
    );

    this.subscriptions.push(
      this.formControls.chargeStationsFloor.valueChanges.subscribe(field => {
        this.getStationsByFloor(field);
      })
    );

    this.subscriptions.push(
      this.formControls.chargingStation.valueChanges.subscribe(field => {
        if (field) {
          this.emptyStation = false;
        }
      })
    );

    this.subscriptions.push(
      this.formControls.defaultTaskType.valueChanges.subscribe(field => {
        if (field === InfrastructureTaskType.GO_TO) {
          this.formControls.defaultTaskFloor.setValidators([Validators.required]);
          this.formControls.defaultTaskArea.setValidators([Validators.required]);
          this.deviceForm.updateValueAndValidity();
        } else {
          this.formControls.defaultTaskFloor.setValidators([]);
          this.formControls.defaultTaskArea.setValidators([]);
          this.deviceForm.updateValueAndValidity();
        }
      })
    );


    if (this.device?.communicationType) {
      this.deviceForm.get('communicationType').patchValue(this.device?.communicationType);
    }

    if (this.device?.station) {
      this.stationId = this.device.station;
      this.getControllers();
    }
    if (this.controllerId) {
      this.formControls.type.setValue("CAMERA");
      this.formControls.controller.setValue(this.controllerId);
    }
  }

  getAreasByInfrastructure(id: string) {
    this.subscriptions.push(this.areasRestService.list(id).subscribe((areas: Area[]) => {
      this.infrastructureAreas = areas;
    }));
  }

  getAreasByFloor(id: string) {
    this.areaList = this.infrastructureAreas ? this.infrastructureAreas.filter((area: Area) => area.floor === id && area.type !== 'RESTRICTED') : [];
  }

  getStationsByFloor(id: string) {
    this.isChargingStationFloorSelected = true;
    this.chargingStations = this.allChargingStations.filter((station: Station) => station.floor === id);
  }

  onModalClose(cancelLoading: boolean) {
    this.loading = !cancelLoading;
  }

  onDetect(data: DetectedDevice) {
    const payload = {
      ...this.deviceForm.value,
      infrastructure: this.infrastructureId,
      system: this.infrastructure.system._id,
      additionalInfo: {},
      product: data.deviceName,
      manufacturer: data.manufacturer,
      productId: data.productId,
      serialNumber: data.serialNumber,
      vendorId: data.vendorId,
      path: data.path,
      protocol: data.protocol,
      isController: false
    } as Device;
    if (this.stationId) {
      payload.station = this.stationId;
      payload.system = this.station.system;
    }

    this.payloadWithNotAosDevice = payload;
    this.notAosDeviceAdded = true;
  }

  saveForm() {
    const taskType = this.deviceForm.get("defaultTaskType").value;
    if (taskType === InfrastructureTaskType.CHARGE && !this.deviceForm.get("chargingStation").value) {
      return this.emptyStation = true;
    }
    const payload = this.deviceForm.value;
    payload.infrastructure = this.infrastructureId;
    payload.system = this.infrastructure.system._id;

    let defaultTask = {} as any;
    if (payload.defaultTaskType) {
      defaultTask.defaultTaskType = payload.defaultTaskType;
    }
    if (payload.defaultTaskFloor) {
      defaultTask.defaultTaskFloor = payload.defaultTaskFloor;
    }
    if (payload.defaultTaskArea) {
      defaultTask.defaultTaskArea = payload.defaultTaskArea;
    }
    if (this.device?.image || this.deviceImage) {
      payload.image = this.deviceImage ? this.deviceImage : this.device.image;
    }
    if (Object.keys(defaultTask)?.length) {
      payload.defaultTask = defaultTask;
    }

    payload.additionalInfo = {};
    if (this.stationId) {
      payload.station = this.stationId;
      payload.system = this.station.system;
    }

    if (payload.controller) {
      const controller = this.controllersList.find(c => c._id === payload.controller);
      payload.station = controller.station;
      payload.system = controller.system;
    }
    payload.isController = payload.type === 'AOS_DEVICE';

    Object.keys(payload).forEach((key) => (payload[key] == null) && delete payload[key]);
    this.processSavingDevice(payload);
  }

  processSavingDevice(payload: Device) {
    if (this.payloadWithNotAosDevice) {
      const deviceToCreate = {
        ...payload,
        ..._.pick(this.payloadWithNotAosDevice, ['communicationType', 'manufacturer', 'path', 'product', 'productId', 'protocol', 'serialNumber', 'vendorId'])
      };
      return this.createNotAosDevice(deviceToCreate);
    }
    if (this.editMode) {
      const { type, ...deviceToUpdate } = payload;
      this.subscriptions.push(
        this.infrastructureRestService.updateDevice(this.device._id, (deviceToUpdate as any)).subscribe((device: Device) => {
          this.device = device;
          this.updateDevice.emit(device);
          this.toastr.success('Device Updated');
          this.quitEditMode.emit(true);
        },
          err => this.toastr.error(err.error.message || err)))
    } else if (this.stationId || this.linkedToStation) {
      this.subscriptions.push(
        this.infrastructureRestService.addDevice(payload).subscribe((device: Device) => {
          this.toastr.success('Device registered');
          if (this.stationId) {
            this.backToStation();
          } else {
            this.closeNewDeviceForm();
          }
        },
          err => this.toastr.error(err.error.message || err)));
    } else {
      this.subscriptions.push(
        this.infrastructureRestService.createDevice(payload).subscribe((device: Device) => {
          this.toastr.success('Device registered');
          this.closeNewDeviceForm();
        },

          err => {
            const errMsg = err.error?.message?.response?.body?.message;
            this.toastr.error(errMsg ? errMsg : 'Error while creating Device')
          }));
    }

  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) {
      try {
        subscription.unsubscribe();
      } catch (e) {}
    }
  }


  runTestConnection() {
    this.testConnectionButton.nativeElement.disabled = true;
    this.textConnection = {
      title: 'Testing...',
      text: 'Sending packages…',
      colorStatus: '#ed9438'
    };

    // Test in Progress
    setTimeout(() => {
      this.textConnection = {
        title: 'Test is done',
        text: 'A connection is setted up and ready to use',
        colorStatus: '#67b231'
      };
      this.testConnectionButton.nativeElement.disabled = true;
    }, 3000);


    // If Test Failed
    // this.textConnection = {
    //   title: 'Retry',
    //   text: 'Connection failed',
    //   colorStatus: '#e96058'
    // };
    // this.testConnectionButton.nativeElement.disabled = false;
  }

  openAutoDetectModal(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.loading = true;
    this.modalService.openModal('AUTODETECT_MODAL', { form: this.deviceForm.value });
  }

  backToStation() {
    this.router.navigate([this.editMode ? './../../../' : '../../', 'stations', this.stationId], { relativeTo:  this.route });
  }

  closeNewDeviceForm() {
    const isFromController = this.stationId && this.linkedToStation;
    const routeToNavigate = isFromController ? `../device/${this.controllerId}` : `../`;

    if (this.editMode) {
      this.quitEditMode.emit(true);
    } else {
      this.deviceForm.reset();
      this.router.navigate([routeToNavigate], { relativeTo: this.route });
    }
  }

  public onCancel(): void {
    const isFromController = this.stationId && this.linkedToStation;
    const isFromStation = this.stationId && !this.editMode && !isFromController;

    if (isFromStation) {
      this.backToStation();
    } else {
      this.closeNewDeviceForm();
    }
  }

  private setSerialNumberValidation() {
    this.deviceForm.get('serialNumber').patchValue(this.device?.serialNumber || '');

    if (this.formControls.type.value === 'AOS_DEVICE' || this.formControls.communicationType.value === 'WIFI' || this.formControls.communicationType.value === 'ETHERNET') {
      this.formControls.serialNumber.setValidators([Validators.required]);
    } else {
      this.formControls.serialNumber.clearValidators();
    }
    this.formControls.serialNumber.updateValueAndValidity();
  }

  private setIsCommunicationTypeValidation() {
    if (this.formControls.type.value !== 'AOS_DEVICE' && this.formControls.type.value !== 'ROBOT') {
      this.formControls.communicationType.setValidators([Validators.required]);
    } else {
      this.formControls.communicationType.setValidators([]);
    }
    this.deviceForm.get('communicationType').patchValue(null);
    this.formControls.communicationType.updateValueAndValidity();
  }

  private getControllers() {
    if (this.stationId) {
      if (this.controllerListSubscription) {
        this.controllerListSubscription.unsubscribe();
      }
      forkJoin([this.stationsRestService.getById(this.stationId), this.stationsRestService.getDevicesByStation(this.stationId)]).subscribe(([station, devices]) => {
        this.station = station;
        this.controllersList = devices.filter((d: Device) => d.isController);
        this.selectedController = this.controllersList.filter(controller => this.formControls.controller.value === controller._id);
        if (this.device?.controller) {
          this.deviceForm.get('controller').patchValue(this.device?.controller);
        }
      });
    } else if (this.infrastructureId) {
      const query = {
        infrastructure: this.infrastructureId
      } as DeviceSearch;
      this.subscriptions.push(
      this.infrastructureRestService.searchDevices(query).subscribe((devices: Device[]) => {
        this.loading = false;
        this.controllersList = devices.filter((device: Device) => {
          return device.isController;
        });
        this.selectedController = this.controllersList.filter(controller => this.formControls.controller.value === controller._id);
      }));
    } else if (this.linkedToStation) {
      this.subscriptions.push(
      this.controllerListSubscription = this.stationsRestService.getById(this.linkedToStation).subscribe(res => {
        this.station = res;
      }))
    }

  }

  private createNotAosDevice(payload: Device) {
    this.subscriptions.push(
    this.infrastructureRestService.createNotAosDevice(payload).subscribe((device: Device) => {
        this.loading = false;
        this.toastr.success('Device registered');
        this.onCancel();
      },

      err => {
        this.loading = false;
        this.toastr.error(err.error.message || err);
      }));
  }

  openUploadWindow() {
    this.uploaderInput.nativeElement.click();
  }

  failedUpload(event: any) {
    this.toastr.error('File upload failed');
  }

  onSuccessUpload(event: any) {
    this.deviceImage = {
      signedUrl: event.signedUrl,
      name: event.name,
      contentType: event.contentType
    };
  }

  onAfterAdd(event: any) {
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

  validatePaymentFormData(data: {accountId: string; agreeTerms: boolean}) {
    this.billingForm.get('accountId').patchValue(data.accountId);
    this.billingForm.get('agreeTerms').patchValue(data.agreeTerms);
  }

  private controllerFieldValidation() {
    if (!this.editMode && this.formControls.type.value !== 'AOS_DEVICE' && this.formControls.type.value !== 'ROBOT') {
      this.formControls.controller.setValidators([Validators.required]);
    } else {
      this.formControls.controller.clearValidators();
    }
    this.formControls.controller.updateValueAndValidity();
  }
}
