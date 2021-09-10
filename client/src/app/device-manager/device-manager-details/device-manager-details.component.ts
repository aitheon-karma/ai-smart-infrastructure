import {
  ApplicationBuildService,
  ApplicationCreationData,
  ApplicationType,
  DriveUploaderComponent,
  InfrastructureTaskType,
  ModalService,
  TASK_MODAL_EVENTS,
  TaskModalService,
} from '@aitheon/core-client';
import { Project } from '@aitheon/creators-studio';
import {
  Device,
  Floor,
  Infrastructure,
  InfrastructureRestService,
  InfrastructureTask,
  InfrastructureTasksRestService,
  StationsRestService,
  Station
} from '@aitheon/smart-infrastructure';
import { GraphsRestService, Graph } from '@aitheon/system-graph';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as d3 from 'd3';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { InfrastructureService } from '../../infrastructures/infrastructure.service';
import { ApplicationsService, GraphData, NodeStatus, ReferenceType } from '../../shared/services/applications.service';
import { OrganizationsService } from '../../shared/services/organizations.service';
import { SharedService } from '../../shared/services/shared.service';

export interface sortedTasks {
  currentTask: InfrastructureTask,
  taskQueue: InfrastructureTask[],
  taskHistory: InfrastructureTask[]
}

export interface ModifiedDevice extends Device {
  robotApplications?: any,
  uiApplications?: any,
  computeNodeApplications?: any
}

@Component({
  selector: 'ai-device-manager-details',
  templateUrl: './device-manager-details.component.html',
  styleUrls: ['./device-manager-details.component.scss']
})

export class DeviceManagerDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('driveUploader') driveUploader: DriveUploaderComponent;

  private _window: Window = window;
  subscriptions$ = new Subscription();
  tasks: InfrastructureTask[] = [];
  device: ModifiedDevice;
  linkedDevices: Device[];
  currentTask: any;
  taskInQueue = [];
  statusDeviceColor: any;
  deviceImage: any;
  serviceKey: any;
  infrastructureId: string;
  organizationId: string;
  isLoading: boolean;
  infrastructure: Infrastructure;
  floor: Floor;
  deviceDetails = true;
  deviceSettings = false;
  tabState = 1;
  sortedTasks: sortedTasks;
  historyTasksCopy = [];
  isChecked: any;
  currentOrganization: any;
  applications: Array<any> = []
  deviceId: string;
  deviceDriver: Project;
  reference: string;
  referenceType: ReferenceType;
  graphURL: string;
  currentControllerStation: Station;
  currentControllerStationFloor: number | null = null;
  coreId: string;

  constructor(
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private infrastructureTasksRestService: InfrastructureTasksRestService,
    private applicationsService: ApplicationsService,
    private applicationBuildService: ApplicationBuildService,
    private taskModalService: TaskModalService,
    private infrastructureService: InfrastructureService,
    private infrastructureRestService: InfrastructureRestService,
    private organizationsService: OrganizationsService,
    private stationsRestService: StationsRestService,
    private graphsRestService: GraphsRestService,
    private sharedService: SharedService,
    private modalService: ModalService,
    private router: Router,
    private activeRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.isLoading = true;
    const { deviceId } = this.route.snapshot.params;
    this.deviceId = deviceId;
    this.subscriptions$.add(this.organizationsService.currentOrganization$.subscribe(org => {
      this.organizationId = org._id;
      this.serviceKey = {
        _id: 'PROJECT_MANAGER',
        key: `${org._id}`
      };
      this.organizationsService.setHeaders(this.graphsRestService);
      this.subscriptions$.add(this.infrastructureService.infrastructureId.subscribe((id) => {
        this.infrastructureId = id;
        this.getInfrastructureData();
        this.getDevice(deviceId);
      }));
    }));
    this.getTasksQueue(deviceId);
    this.listenTaskModalEvents();
    this.getDevices();
    this.onModalClose();
  }

  getDeviceGraphData(): void {
    this.reference = this.device.isController ? this.device._id : this.device.station || this.infrastructureId;
    this.referenceType = this.device.isController ? ReferenceType.CONTROLLER :  this.device.station ? ReferenceType.STATION : ReferenceType.INFRASTRUCTURE;
    this.subscriptions$.add(this.applicationsService.getApplications(this.reference, this.referenceType).subscribe((graphData: GraphData) => {
      this.applications = [];
      this.coreId = graphData.graphId;
      const { applications } = graphData;
      applications.forEach((app: any) => {
        if (app.project?.projectType === ApplicationType.DEVICE_NODE) {
          this.deviceDriver = app.project;
        } else if (app.device === this.deviceId) {
          this.applications.push(app);
        }
      });
      this.filterAppsByType(this.applications);
      this.graphURL = `/system-graph/graphs/organization/service/SMART_INFRASTRUCTURE/sub-graph/${graphData?.graphId}`;
      this.applicationBuildService.setBuildStatus$(null);
    }));
  }

  getTasksQueue(deviceId: string) {
    this.subscriptions$.add(this.infrastructureTasksRestService.list(deviceId).subscribe((tasks: InfrastructureTask[]) => {
      this.sortedTasks = this.sortTasks(tasks);
      this.historyTasksCopy = [...this.sortedTasks.taskHistory];
    }));
  }

  getInfrastructureData() {
    this.isLoading = true;
    this.subscriptions$.add(this.infrastructureRestService.getById(this.infrastructureId).subscribe((infrastructure: Infrastructure) => {
      this.infrastructure = infrastructure;
      if (this.device) {
        this.getFloorData();
      }
      this.isLoading = false;
    }));
  }

  getDevice(deviceId: string) {
    this.isLoading = true;
    this.subscriptions$.add(this.infrastructureRestService.getDeviceById(deviceId).subscribe((device: Device) => {
      this.device = device;

      if (this.device.isController && this.device.station) {
        this.getControllerStation(this.device.station);
      }

      this.getDeviceGraphData();
      if (this.infrastructure) {
        this.getFloorData();
      }
      this.getStyling();
      this.isLoading = false;
      this.getBatteryColor();
    }));
  }

  getFloorData() {
    this.floor = this.infrastructure.floors.find((floor: Floor) => floor._id === this.device.floor);
  }

  getStyling() {
    this.statusDeviceColor = {
      'status-label--aqua-blue': this.device.status === 'ONLINE',
      'status-label--base-yellow': this.device.status === 'Need charging',
      'status-label--base-orange': this.device.status === 'Abstracted' || this.device.status === 'Lost',
      'status-label--base-red': this.device.status === 'OFFLINE',
      'status-label--base-green': this.device.status === 'Working',
      'status-label--base-violet': this.device.status === 'READY',
    };
  }

  openCore(): void {
    this._window.open(this.graphURL, '_blank');
  }

  listenTaskModalEvents() {
    const sub = this.taskModalService.taskModalEvents$
      .pipe(filter((event: any) => event.eventType === TASK_MODAL_EVENTS.CREATED))
      .subscribe(() => this.getTasksQueue(this.device._id));
    this.subscriptions$.add(sub);
  }

  addTask() {
    this.taskModalService.openModal({
      service: environment.service,
      taskType: InfrastructureTaskType.GO_TO,
      smartInfrastructureTaskConfig: {
        infrastructure: this.infrastructureId,
        device: this.device._id
      }
    });
  }

  goToDeviceSettings() {
    this.deviceDetails = false;
    this.deviceSettings = true;
  }

  goToDevice(event: any, deviceId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['../../device-manager', 'device', deviceId], { relativeTo: this.route });
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
    this.subscriptions$.add(this.infrastructureRestService.editDeviceImage(this.device._id, this.deviceImage).subscribe((device: Device) => {
      this.device.image = device.image;
      this.toastr.success('Image updated successfully');
    }));
  }

  onUpdateDevice(device: Device) {
    this.device = device;
  }

  getDevices() {
    this.subscriptions$.add(this.infrastructureRestService.getFreeDevicesLinkToController(this.deviceId).subscribe((devices: Device[]) => {
      this.linkedDevices = devices;
    }));
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

  quitEditMode($event: boolean) {
    this.deviceDetails = true;
    this.deviceSettings = false;
    this.getBatteryColor();
  }

  onDeleteDevice(): void {
    this.modalService.openGenericConfirm({
      text: 'Device will be removed from the organization. Are you sure that you want to remove device?',
      headlineText: 'Remove device',
      confirmText: 'Remove',
      creationConfirm: true,
      callback: confirm => {
        if (confirm) {
          this.deleteDevice();
        }
      }
    });
  }

  deleteDevice() {
    this.subscriptions$.add(this.infrastructureRestService.deleteDevice(this.device._id)
      .subscribe(res => {
      this.router.navigate(['../../'], { relativeTo: this.route });
      this.toastr.success('Device successfully deleted!');
    },
      err => this.toastr.error(err.error.message || err)));
  }

  turnOffDevice() {

  }

  switchTab(tabIndex?: number) {
    this.tabState = tabIndex;
  }

  sortTasks(tasks: InfrastructureTask[]) {
    let currentTask;
    const taskQueue = [];
    const taskHistory = [];
    tasks.map((task: InfrastructureTask) => {
      switch (task.status) {
        case 'IN_PROGRESS': {
          currentTask = task;
          break;
        }
        case 'PENDING' || 'IN_QUEUE': {
          taskQueue.push(task);
          break;
        }
        default:
          taskHistory.push(task);
      }
    })

    return { currentTask, taskQueue, taskHistory };
  }

  public onRemoveDevice(event: Event, deviceId: string, device?: any): void {
    this.stopEvent(event);
    this.modalService.openGenericConfirm({
      text: 'Device will be removed from the organization. Are you sure that you want to remove device?',
      headlineText: 'Remove device',
      confirmText: 'Remove',
      creationConfirm: true,
      callback: confirm => {
        if (confirm) {
          this.removeDevice(deviceId);
        }
      }
    });
  }

  public removeDevice(deviceId: string): void {
    this.isLoading = true;
    const actionsArray = [
      this.removeDeviceFromGraph(deviceId),
      this.removeDeviceFroDeviceManager(deviceId),
    ];

    forkJoin(actionsArray).subscribe(() => {
      this.linkedDevices = this.linkedDevices.filter((d: Device) => d._id !== deviceId);
      this.toastr.success('Device successfully removed!');
      this.isLoading = false;
    },
      (error: Error) => {
        this.toastr.error(error.message || 'Unable to remove device');
        this.isLoading = false;
      });
  }

  removeDeviceFroDeviceManager(deviceId: string) {
    return this.sharedService.deleteDevice(deviceId);
  }

  removeDeviceFromGraph(deviceId: string) {
    return this.graphsRestService.removeDevice({
      device: deviceId,
      reference: this.device._id,
      subType: Graph.SubTypeEnum.CONTROLLER,
      infrastructure: null,
    });
  }

  moveDeviceToInfrastructure(deviceId) {
    return this.infrastructureRestService.updateDevice(deviceId, {
      station: null,
      system: this.infrastructure?.system,
      controller: null
    } as Device);
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  deleteDriver() {
    this.modalService.openGenericConfirm({
      text: `Are you sure you want to delete driver from controller?`,
      headlineText: `Delete driver`,
      confirmText: `Delete`,
      creationConfirm: true,
      callback: (confirm) => {
        if (confirm) {
          this.onDeleteDriver();
        }
      }
    });
  }

  onDeleteDriver() {
    this.subscriptions$.add(this.graphsRestService.removeDriverFromController({
      device: this.device,
      reference: this.reference
    }).subscribe(() => {
      this.deviceDriver = null;
      this.toastr.success('Removed');
    }));
  }

  searchHistoryTasks(value: string) {
    this.sortedTasks.taskHistory = this.historyTasksCopy.filter(task => {
      return task?.taskNumber.toString().includes(value) || task.orchestratorTask.name.toLowerCase().includes(value.toLowerCase());
    })
  }

  getBatteryColor() {
    setTimeout(() => {
      switch (true) {
        case (this.device?.batteryHealth <= 10):
          this.setBatteryIconColor('#E96058', [0]);
          break;
        case (this.device?.batteryHealth <= 30):
          this.setBatteryIconColor('#E96058', [0, 1]);
          break;
        case (this.device?.batteryHealth <= 60):
          this.setBatteryIconColor('#FFF', [0, 1, 2]);
          break;
        case (this.device?.batteryHealth > 60):
          this.setBatteryIconColor('#FFF', [0, 1, 2, 3]);
          break;
      }
    }, 44);
  }

  get batteryIcon(): any {
    return [
      d3.select('#battery'),
      d3.select('#battery-low'),
      d3.select('#battery-medium'),
      d3.select('#battery-full')
    ];
  }

  setBatteryIconColor(color: string, sectionsToFill: number[]) {
    sectionsToFill.forEach(item => {
      this.batteryIcon[item].attr('fill', color);
    })
  }

  openDiverFlowModal() {
    this.modalService.openModal('AUTOMATE_MODAL', {
      type: 'DEVICE_DRIVER',
      device: this.device,
      subGraphReference: this.reference
    });
  }

  openAutomationNodeModal() {
    this.modalService.openModal('AUTOMATE_MODAL', {
      type: 'APPLICATION',
      reference: this.reference,
      deviceId: this.deviceId,
      existing: this.applications.map(app => app?.project?._id) || [],
    });
  }

  openAutomationNodeAosModal() {
    this.modalService.openModal('AUTOMATE_MODAL', {
      type: ApplicationType.DEVICE_NODE,
      reference: this.reference,
      deviceId: this.deviceId,
      existing: this.applications.map(app => app?.project?._id) || [],
    });
  }

  openAddDevicesModal() {
    const queryParams = { stationId: this.device.station } as any;
    if (this.device) {
      queryParams.controllerId = this.device._id;
      if (this.device.station) {
        queryParams.linkedToStation = this.device.station;
      }
    }
    this.router.navigate(['../../../', 'device-manager', 'new'], { queryParams, relativeTo:  this.activeRoute }).then();
  }

  onModalClose(): void {
    this.subscriptions$.add(this.modalService.onModalClose$.subscribe(({ type }) => {
      if (type === 'ADD_DEVICE_MODAL') {
        this.getDevices();
      }
      if (type === 'ADD_APPLICATION_MODAL') {
        this.getDeviceGraphData();
      }
    }));
  }

  waitForAppDeployment() {
    const timeout = setTimeout(() => {
      this.getDeviceGraphData();

      clearTimeout(timeout);
    }, 22000);
  }

  public onCreateNode(event: ApplicationCreationData): void {
    event.subType = ApplicationType.APPLICATION;
    event.meta = { deviceId: this.deviceId };
    if (this.referenceType === ReferenceType.INFRASTRUCTURE) {
      event.meta.infrastructureId = this.reference;
    }
    if (this.referenceType === ReferenceType.STATION) {
      event.meta.stationId = this.reference;
    }
    this.applicationBuildService.createApplication(event);
    this.onBuildFinish();
  }

  onBuildFinish(): void {
    this.subscriptions$.add(this.applicationBuildService.buildFinished$.pipe(take(1))
      .subscribe(() => {
        location.reload();
      }));
  }

  public deleteApplication(graphNodeId: string): void {
    this.modalService.openGenericConfirm({
      text: `Are you sure you want to delete this application?`,
      headlineText: `Delete application`,
      confirmText: `Delete`,
      creationConfirm: true,
      callback: (confirm) => {
        if (confirm) {
          this.onDeleteStationApplication(graphNodeId);
        }
      }
    });
  }

  public onDeleteStationApplication(graphNodeId: string): void {
    this.isLoading = true;
    this.subscriptions$.add(this.graphsRestService.removeApplication({
      graphNodeId,
    }).subscribe(() => {
      this.toastr.success('Application successfully removed!');
      this.getDeviceGraphData();
      this.isLoading = false;
    },
      (error) => {
        this.isLoading = false;
        this.toastr.error(error?.message || 'Unable to remove application');
      }));
  }

  deployApplication(application: any, isDeploying: boolean): void {
    this.subscriptions$.add(this.graphsRestService.deployNode({ graphNodeId: application?.graphNodeId, publish: isDeploying })
      .pipe(take(1)).subscribe(() => {
        application.status = isDeploying ? NodeStatus.RUNNING : NodeStatus.TERMINATED;
      },
        error => {
          this.toastr.error(error?.message || `Unable to ${isDeploying ? 'deploy' : 'stop'} application`)
        }));
  }


  goToApplication(app: any): void {
    if (app?.status === NodeStatus.RUNNING || app?.status === NodeStatus.PENDING) {
      window.open(`${environment.production ? '/smart-infrastructure' : ''}/applications/dashboard/${this.coreId}/${app?.graphNodeId}`, '_blank');
    }
  }

  editApplication(project: Project): void {
    this.applicationBuildService.editApplication(project?._id);
    this.onBuildFinish();
  }

  updateAppToLatest(graphNodeId: string): void {
    this.subscriptions$.add(this.graphsRestService.deployNode({
      publish: true,
      updateToLatestRelease: true,
      graphNodeId,
    }).subscribe(() => {
      this.getDeviceGraphData();
    }));
  }

  private getControllerStation(stationId: string): void {
    this.subscriptions$.add(this.stationsRestService.getById(stationId)
      .subscribe(station => {
        this.currentControllerStation = station;
        this.currentControllerStationFloor = this.getStationFloor(this.currentControllerStation);
      }));
  }

  private getStationFloor(station: any): number | null {
    const stationFloorId = station.floor;
    let floor = stationFloorId
      ? this.infrastructure.floors.find(floor => floor._id === stationFloorId)
      : null;

    return floor ? floor.number : null;
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {
    }
  }

  filterAppsByType(applications: any) {
    this.device.robotApplications = applications.filter(app => app.project.projectType === 'ROBOT');
    this.device.uiApplications = applications.filter(app => app.project.projectType === 'APP');
    this.device.computeNodeApplications = applications.filter(app => app.project.projectType === 'COMPUTE_NODE');
  }

  goToFloor() {
    this.router.navigate([`infrastructure/${this.device?.infrastructure}/dashboard`], {queryParams: {floor: this.floor?.number} });
  }
}
