import {Component, OnInit, ViewChild} from '@angular/core';
import { Subscription } from 'rxjs';
import {Infrastructure, InfrastructureRestService, DeviceSearch, Device} from '@aitheon/smart-infrastructure';
import { InfrastructureService } from '../../infrastructures/infrastructure.service';
import { DeviceManagerListComponent } from '../device-manager-list/device-manager-list.component';
import {ModalService} from "@aitheon/core-client";

@Component({
  selector: 'ai-device-manager-dashboard',
  templateUrl: './device-manager-dashboard.component.html',
  styleUrls: ['./device-manager-dashboard.component.scss']
})
export class DeviceManagerDashboardComponent implements OnInit {

  @ViewChild(DeviceManagerListComponent)
  deviceManagerListComponent: DeviceManagerDashboardComponent;

  initialFiltersDate = {
    title: 'Device Manager'
  };
  infrastructureId: string;
  subscriptions: Subscription[] = [];
  infrastructure: Infrastructure;
  addFloorForm: boolean = false;

  filter: DeviceSearch;
  devices: Device[];
  loading: boolean = false;
  ptpStatus = 'DISABLED'; // Permission to pay

  constructor(
    private infrastructureRestService: InfrastructureRestService,
    private infrastructureService: InfrastructureService,
    private modalService: ModalService,
  ) {}

  ngOnInit() {
    this.loading = true;
    this.subscriptions.push(this.infrastructureService.infrastructureId.subscribe((id) => {
      this.infrastructureId = id;
      this.getInfrastructureData();
    }));
  }

  getInfrastructureData() {
    this.subscriptions.push(this.infrastructureRestService.getById(this.infrastructureId).subscribe((infrastructure: Infrastructure) => {
      this.infrastructure = infrastructure;
      this.getDevices();
    }));
  }

  goAddFloorForm() {
    this.addFloorForm = !this.addFloorForm;
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) {
      try {
        subscription.unsubscribe();
      } catch (e) {}
    }
  }

  getDevices() {
    this.loading = true;
    const query = {
      ...this.filter,
      infrastructure: this.infrastructure._id
    } as DeviceSearch;

    this.infrastructureRestService.searchDevices(query).subscribe((devices: Device[]) => {
      this.loading = false;
      this.devices = devices;
      this.parseDevices(devices);
    });
  }

  parseDevices(devices: Device[]) {
    this.devices = devices.map((device: Device) => {
      const floor = this.infrastructure.floors.find(f => f._id === device.floor);
      const taskFloor = this.infrastructure.floors.find(f => device.currentTask && f._id === device.currentTask.floor);
      return {
        ...device,
        floor,
        taskFloor
      };
    });
  }

  onFilterData(filter: DeviceSearch) {
    this.filter = filter;
    this.getDevices();
  }

  onAddDeviceModal() {
    this.modalService.openModal('ADD_DEVICE_MODAL', {
      infrastructureId: this.infrastructureId,
      system: this.infrastructure.system,
      isController: false,
      mode: 'FROM_DEVICE_TAB',
    });
    // TODO:
    //  if no empty seats and user has no permission to pay:
    //  - this.ptpStatus = 'ENABLED'; -> call modal
    //  - disable open Modal to add/create new Devices
  }
}
