import { Subscription } from 'rxjs';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Component, OnInit, Output, ViewChild, TemplateRef, EventEmitter } from '@angular/core';
import { Device, DeviceSearch, InfrastructureRestService } from '@aitheon/smart-infrastructure';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalService } from '@aitheon/core-client';
import { BillingClientService } from "../../services/billing-client.service";

@Component({
  selector: 'ai-add-device-modal',
  templateUrl: './add-device-modal.component.html',
  styleUrls: ['./add-device-modal.component.scss']
})
export class AddDeviceModalComponent implements OnInit {
  @Output() deviceAdded: EventEmitter<boolean> = new EventEmitter()
  @ViewChild('addDeviceModal') addDeviceModal: TemplateRef<any>;

  modalType = 'ADD_DEVICE_MODAL';
  addDeviceModalRef: BsModalRef;
  loading: boolean = true;
  selectedDevices: Array<any> = [];
  mode: string = 'STATION';
  currentOrganization: any;
  deviceNodes: Array<any> = [];
  activeProject: any;
  stationId: string;
  infrastructureId: string;
  selectedDevice: Device;

  filter: DeviceSearch;
  data: any;

  public devices: Array<any> = [];
  addBtnDisable: boolean = false;
  private subscriptions$ = new Subscription();
  calledFromDeviceTab: boolean;
  totalPrice: number;
  currentYear = new Date().getFullYear();
  currentMonth = new Date().toLocaleString('default', { month: 'long' });
  noEmptySeats = false; // Hardcoded
  userCanPay = true; // Hardcoded

  constructor(
    private bsModalService: BsModalService,
    private modalService: ModalService,
    private infrastructureRestService: InfrastructureRestService,
    private router: Router,
    private activeRoute: ActivatedRoute,
    public billingClientService: BillingClientService,
  ) {
    this.activeRoute.paramMap.subscribe(params => {
      this.stationId = params.get('stationId');
    });
  }

  ngOnInit(): void {
    this.loading = true;
    this.selectedDevices = [];
    this.subscriptions$.add(this.modalService.openModal$.subscribe(({type, data}) => {
      if (type === this.modalType) {
        this.loading = true;
        this.data = data;
        this.infrastructureId = data.infrastructureId;
        this.stationId = this.data?.station?._id;

        this.getDevices();

        this.show();
      }

    }));
  }

  public show() {
    this.addDeviceModalRef = this.bsModalService.show(
      this.addDeviceModal,
      Object.assign({}, {class: 'add-device-modal'})
    );
    this.calledFromDeviceTab = !!(this.data?.mode && this.data?.mode === 'FROM_DEVICE_TAB');
    if (this.calledFromDeviceTab && this.noEmptySeats) {
      this.subscriptions$.add(this.billingClientService.getUserAccounts().subscribe((data: { userAccounts: any, defaultUserAccount: any }) => {
        this.totalPrice = 811;  // Hardcoded
      }));
    }
  }

  public closeModal() {
    this.loading = true;
    this.selectedDevice = null;
    this.devices = [];
    this.addDeviceModalRef.hide();
  }

  getDevices() {
    // const query = this.calledFromDeviceTab ?
    //   null :
    //   {
    //     ...this.filter,
    //     infrastructure: this.infrastructureId
    //   } as DeviceSearch;
    this.subscriptions$.add(this.infrastructureRestService.searchDevices().subscribe((devices: Device[]) => {
      this.devices = this.filterDevices(devices);
      this.addBtnDisable = !this.devices.length;
      this.loading = false;
    }));
  }

  public isDeviceActive(device): boolean {
    return this.selectedDevice && this.selectedDevice._id === device._id;
  }

  public selectDevice(device): void {
    this.selectedDevice = device;
  }

  onAdd(): void {
    this.addBtnDisable = true;
    this.calledFromDeviceTab ? this.addDeviceToInfrastructure() : this.addDeviceToStation();
  }

  onAddNewDevice() {
    const queryParams = { stationId: this.stationId } as any;
    if (this.data.controller) {
      queryParams.controllerId = this.data.controller._id;
    }
    if (this.data.isController) {
      queryParams.isController = this.data.isController;
    }
    this.router.navigate(['../../', 'device-manager', 'new'], { queryParams , relativeTo:  this.activeRoute }).then();
    this.addDeviceModalRef.hide();
  }

  openAddNewDeviceFromDevicePage() {
    const queryParams = { stationId: this.stationId } as any;
    if (this.data.controller) {
      queryParams.controllerId = this.data.controller._id;
      if (this.data.controller.station) {
        queryParams.linkedToStation = this.data.controller.station;
      }
    }
    this.router.navigate(['../../../', 'device-manager', 'new'], { queryParams, relativeTo:  this.activeRoute }).then(() => {
      this.addDeviceModalRef.hide();
    });
  }

  ngOnDestroy() {
    try {
      this.subscriptions$.unsubscribe();
    } catch (error) {}
  }

  private filterDevices(devices: Device[]) {
    return devices.filter(device => {
      let query = true;
      if (this.calledFromDeviceTab) {
        // take all free Devices from Device Manager
        return !device?.infrastructure;
      } else {
        if (this.data.isController) {
          query =
            // all Free Controllers from Device Manager
            (!device?.infrastructure && (device?.canBeController || device?.type?.name === 'AOS_DEVICE')) ||
            // all Free Controllers from current Infrastructure
            (device?.infrastructure && device?.infrastructure === this.infrastructureId && (device?.canBeController || device?.type?.name === 'AOS_DEVICE'));
        } else {
          query =
            // all Free Devices without Controllers from Device Manager
            (!device?.infrastructure && !device?.canBeController && !device?.isController && device?.type?.name !== 'AOS_DEVICE') ||
            // all Free Devices without Controllers from current Infrastructure
            (device?.infrastructure && device?.infrastructure === this.infrastructureId && !device?.canBeController && !device?.isController && device?.type?.name !== 'AOS_DEVICE');
        }

        return !device.station && !device.controller && query;
      }
    });
  }

  private addDeviceToInfrastructure() {
    const deviceToAdd = {
      ...this.selectedDevice,
      infrastructure: this.infrastructureId,
      system: this.data.system,
    }

    this.subscriptions$.add(this.infrastructureRestService.addDevice(deviceToAdd, true).subscribe(() => {
      this.deviceAdded.emit(true);
      this.closeModal();
    }));
  }

  private addDeviceToStation() {
    const deviceToAdd = {
      ...this.selectedDevice,
      type: this.selectedDevice.type._id || this.selectedDevice.type,
      isController: !!this.data.isController
    } as Device;
    // Device is free condition
    if (!deviceToAdd.infrastructure) {
      deviceToAdd.infrastructure = this.infrastructureId
    }
    if (this.data.station) {
      deviceToAdd.station = this.data.station._id;
      deviceToAdd.system = this.data.station.system;
    }
    if (this.data.controller) {
      deviceToAdd.controller = this.data.controller._id;
    }
    this.subscriptions$.add(this.infrastructureRestService.addDevice(deviceToAdd, true).subscribe((device: Device) => {
      this.modalService.onModalClose(this.modalType, {
        stationId: this.stationId,
        device,
      });
      this.deviceAdded.emit(true);
      this.closeModal();
    }));
  }

  get daysInMonth() {
    return new Date(this.currentYear, new Date().getMonth(), 0).getDate();
  }
}
