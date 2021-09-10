import { ApplicationBuildService, ModalService } from '@aitheon/core-client';
import { Project } from '@aitheon/creators-studio';
import {
  Device,
  Floor,
  Infrastructure,
  InfrastructureRestService,
  StationsRestService
} from '@aitheon/smart-infrastructure';
import { GraphsRestService } from '@aitheon/system-graph';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, OperatorFunction, Subscription } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { InfrastructureService } from '../../infrastructures/infrastructure.service';
import {
  ApplicationsService,
  ApplicationType,
  NodeStatus,
  ReferenceType
} from '../../shared/services/applications.service';
import { OrganizationsService } from '../../shared/services/organizations.service';
import { SharedService } from '../../shared/services/shared.service';
import { getFormattedFloorNumber } from '../../shared/utils/formatted-names';

export interface StationDevice extends Device {
  robotApplications?: any;
  uiApplications?: any;
  computeNodeApplications?: any;
}

@Component({
  selector: 'ai-station-page',
  templateUrl: './station-page.component.html',
  styleUrls: ['./station-page.component.scss']
})

export class StationPageComponent implements OnInit {

  private subscriptions$ = new Subscription();

  infrastructureId: string;
  infrastructure: Infrastructure;
  isContextMenuVisible = false;
  stationId: string;
  isLoading = false;
  station: any;
  graphUrl: string;
  currentOrganization: any;
  applications: Array<any>;
  cloudApplications: any[];
  _window = window;
  editStationMode = false;
  controllers: StationDevice[];
  devicesWithoutController: Device[];
  coreId: string;

  status: string;
  activeController: string;

  constructor(
    private infrastructuresRestService: InfrastructureRestService,
    private toaster: ToastrService,
    private graphsRestService: GraphsRestService,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private stationsRestService: StationsRestService,
    private modalService: ModalService,
    private route: ActivatedRoute,
    private organizationsService: OrganizationsService,
    private infrastructureService: InfrastructureService,
    private applicationsService: ApplicationsService,
    private applicationBuildService: ApplicationBuildService,
    private sharedService: SharedService,
  ) {
    this.activeRoute.paramMap.subscribe(params => {
      this.stationId = params.get('stationId');
    });
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.organizationsService.currentOrganization$.pipe(
      take(1),
      switchMap(organization => {
        this.currentOrganization = organization;
        if (!environment.production) {
          this.organizationsService.setHeaders(this.graphsRestService);
        }
        return this.infrastructureService.infrastructureId.asObservable();
      })).subscribe(infrastructureId => {
      this.infrastructureId = infrastructureId;
      if (this.infrastructureId) {
        this.loadData();
      }
    });

    this.onModalClose();
  }

  private handleError(message: string): OperatorFunction<any, any> {
    return catchError(() => {
      this.toaster.error(message);
      return of(undefined);
    });
  }

  loadData(): void {
    forkJoin([
      this.infrastructuresRestService.getById(this.infrastructureId)
        .pipe(this.handleError('Unable to load infrastructure...')),
      this.stationsRestService.getById(this.stationId)
        .pipe(this.handleError('Unable to load station...')),
      this.stationsRestService.getDevicesByStation(this.stationId)
        .pipe(this.handleError('Unable to load devices...')),
        // TO_DO
      this.applicationsService.getApplications(this.stationId, ReferenceType.STATION)
        .pipe(this.handleError('Unable to load station applications...'))
    ]).pipe(take(1)).subscribe(([infrastructure, station, devices, graphData]) => {
      this.coreId = graphData?.graphId;
      this.infrastructure = infrastructure;
      const stationDevices = [] as Device[];
      const stationControllers = [] as Device[];
      devices.forEach((device: Device) => {
        if (device.isController) {
          stationControllers.push(device);
        } else {
          stationDevices.push(device);
        }
      });
      this.station = {
        ...station,
        devices: stationDevices,
        controllers: stationControllers,
      };
      if (this.station.floor) {
        this.station.floor = this.infrastructure.floors.find((floor: Floor) => floor._id === this.station.floor);
      }
      this.controllers = this.station.controllers;
      this.status = graphData.status;
      this.graphUrl = `/system-graph/graphs/organization/service/SMART_INFRASTRUCTURE/sub-graph/${this.coreId}`;
      this.getApplications(graphData?.applications, this.controllers);
      this.getDevices(this.station.devices, this.controllers);
      this.isLoading = false;
    });
  }

  getApplications(applications: any[], controllers?: Device[]) {
    this.cloudApplications = applications;

    if (controllers) {
      const controllersObs = {} as any;
      controllers.forEach((c: Device) => {
        controllersObs[c._id] = this.applicationsService.getApplications(c._id, ReferenceType.CONTROLLER);
      });

      forkJoin(controllersObs).subscribe({
        next: result => this.linkAppsToControllers(result, controllers),
        error: this.handleError('Unable to load application for controllers...')
       });

    }

  }

  linkAppsToControllers(data: { [key: string]: any }, controllers: Device[]) {
    controllers.forEach((controller: Device) => {
      const controllersApps = [] as any[];
      let controllerDriver: any;
      if (data[controller._id] && data[controller._id].applications) {
        data[controller._id].applications.forEach((app: any) => {
          if (app ?.project ?.projectType !== ApplicationType.DEVICE_NODE) {
            controllersApps.push(app);
          } else {
            controllerDriver = app ?.project;
          }
        });
      }

      controller.driver = controllerDriver;
      controller.applications = controllersApps;
    });

    this.filterAppsByType(this.controllers);
  }

  getDevices(devices: Device[], controllers?: Device[]) {
    const cloudDevices = [];
    const controllersDevices = {};
    devices.forEach((device: any) => {
      if (!device.controller) {
        cloudDevices.push(device);
      } else {
        controllersDevices[device.controller] = controllersDevices[device.controller] ? [...controllersDevices[device.controller], device] : [device];
      }
    });
    if (controllers) {
      controllers.forEach((controller: Device) => {
        controller.devices = controllersDevices[controller._id];
      });
    }

    this.devicesWithoutController = cloudDevices;
  }

  onModalClose(): void {
    this.subscriptions$.add(this.modalService.onModalClose$.subscribe(({ data, type }) => {
      if (type === 'ADD_DEVICE_MODAL' && data?.stationId === this.station?._id) {
        if (data?.device) {
          if (!data?.device?.controller) {
            if (this.devicesWithoutController) {
              this.devicesWithoutController.push(data?.device);
            } else {
              this.devicesWithoutController = [data?.device];
            }
          } else {
            const controller = this.controllers.find(({ _id }) => _id === data.device.controller);
            if (controller) {
              if (controller.devices) {
                controller.devices.push(data.device);
              } else {
                controller.devices = [data.device];
              }
            }
          }
          this.filterAppsByType(this.controllers);
          this.toaster.success('Device successfully added!');
        }
      }
    }));
  }

  openDiverFlowModal(device: Device) {
    this.modalService.openModal('AUTOMATE_MODAL', { type: 'DEVICE_DRIVER', device, subGraphReference: device._id });
  }

  deleteDriver(controller: Device, event?: Event) {
    if (event) {
      this.stopEvent(event);
    }
    this.modalService.openGenericConfirm({
      text: `Are you sure you want to delete driver from controller?`,
      headlineText: `Delete driver`,
      confirmText: `Delete`,
      creationConfirm: true,
      callback: (confirm) => {
        if (confirm) {
          this.onDeleteDriver(controller);
        }
      }
    });
  }

  deleteStation(event?: Event) {
    if (event) {
      this.stopEvent(event);
    }
    this.modalService.openGenericConfirm({
      text: `Are you sure you want to delete station?`,
      headlineText: `Delete station`,
      confirmText: `Delete`,
      creationConfirm: true,
      callback: (confirm) => {
        if (confirm) {
          this.onDeleteStation();
        }
      }
    });
  }

  onDeleteStation() {
    this.stationsRestService.remove(this.station._id).subscribe(() => {
      this.toaster.success('Successfully removed!');
      this.router.navigate(['../'], { relativeTo: this.route });
    },
    err => {
      this.toaster.error(err.error.message);
    })
  }

  onDeleteDriver(controller: Device) {
    this.graphsRestService.removeDriverFromController({
      device: controller,
      reference: controller._id
    }).subscribe(() => {
      controller.driver = undefined;
      this.toaster.success('Driver removed');
    });
  }

  openCore() {
    if (this.graphUrl) {
      window.open(this.graphUrl, '_blank');
    }
  }

  toggleContextMenu(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.isContextMenuVisible = !this.isContextMenuVisible;
  }

  onAddDevice(isController: boolean, device?: Device) {
    if (device) {
      const queryParams = { stationId: this.stationId } as any;
      if (device) {
        queryParams.controllerId = device._id;
      }
      if (isController) {
        queryParams.isController = isController;
      }
      this.router.navigate(['../../', 'device-manager', 'new'], { queryParams , relativeTo:  this.activeRoute }).then();
    } else {
      this.modalService.openModal('ADD_DEVICE_MODAL', {
        infrastructureId: this.infrastructureId,
        isController,
        controller: device,
        station: this.station
      });
    }
  }

  public onCreateNode(event: { name: string, service: string, type: string, subType: string, deviceId: string, meta: { stationId: string, deviceId: string } }): void {
    event.subType = ApplicationType.APPLICATION;
    event.meta = { stationId: this.stationId, deviceId: event.deviceId };
    this.applicationBuildService.createApplication(event as any);
    this.onBuildFinish();
  }

  editApplication(project: Project): void {
    this.applicationBuildService.editApplication(project?._id);
    this.onBuildFinish();
  }

  onBuildFinish(): void {
    this.applicationBuildService.buildFinished$.pipe(take(1))
      .subscribe(() => {
        location.reload();
      });
  }

  riseApplicationRelease(application: any): void {
    this.isLoading = true;
    this.subscriptions$.add(this.graphsRestService.deployNode({
      graphNodeId: application?.graphNodeId,
      publish: true,
      updateToLatestRelease: true
    }).subscribe(() => {
        application.isLatest = true;
        this.isLoading = false;
        this.toaster.success('Successfully updated!');
      },
      (e) => {
        this.toaster.error(e.message);
        this.isLoading = false;
      }));
  }

  deployApplication(application: any, isDeploying: boolean): void {
    this.graphsRestService.deployNode({ graphNodeId: application?.graphNodeId, publish: isDeploying }).pipe(
      take(1),
    ).subscribe(() => {
        application.status = isDeploying ? 'RUNNING' : 'TERMINATED';
      },
      error => {
        this.toaster.error(error?.message || `Unable to ${isDeploying ? 'deploy' : 'stop'} application`);
      });
  }

  fetchApplications(): void {
    this.isLoading = true;
    this.subscriptions$.add(this.applicationsService.getApplications(
      this.stationId,
      ReferenceType.STATION,
      [ApplicationType.APPLICATION, ApplicationType.DEVICE_NODE],
    ).pipe(this.handleError('Unable to load applications')).subscribe(graphData => {
      if (graphData) {
        this.getApplications(graphData?.applications, this.controllers);
      }
      this.isLoading = false;
    }));
  }

  onAddDriver(data: { controllerId: string, driver: Project }): void {
    if (data?.driver && data?.controllerId) {
      const controller = this.controllers.find(({ _id }) => _id === data.controllerId);
      if (controller) {
        controller.driver = data.driver;
        this.toaster.success('Driver successfully added!');
      }
      this.filterAppsByType(this.controllers);
    }
  }

  public deleteApplication(graphNodeId: string, controller?: any): void {
    this.modalService.openGenericConfirm({
      text: `Are you sure you want to delete this application?`,
      headlineText: `Delete application`,
      confirmText: `Delete`,
      creationConfirm: true,
      callback: (confirm) => {
        if (confirm) {
          this.onDeleteStationApplication(graphNodeId, controller);
        }
      }
    });
  }

  public onDeleteStationApplication(graphNodeId: string, controller?: any): void {
    this.isLoading = true;
    this.subscriptions$.add(this.graphsRestService.removeApplication({
      graphNodeId,
    }).subscribe(() => {
        if (controller) {
          controller.applications = controller.applications?.filter(app => app?.graphNodeId !== graphNodeId) || [];
        } else {
          this.cloudApplications = this.cloudApplications?.filter(app => app?.graphNodeId !== graphNodeId) || [];
        }
        this.filterAppsByType(this.controllers);
        this.isLoading = false;
        this.toaster.success('Application successfully removed!');
      },
      (error) => {
        this.isLoading = false;
        this.toaster.error(error?.message || 'Unable to remove application');
      }));
  }

  createApp(controller?: any) {
    this.modalService.openModal('AUTOMATE_MODAL', {
      type: ApplicationType.APPLICATION,
      deviceId: controller?._id,
      reference: controller ? controller._id : this.stationId,
      existing: (controller ? (controller?.applications || []) : (this.cloudApplications || [])).map(({ project }) => project?._id),
    });
  }

  addNode(controller?: any) {
    this.modalService.openModal('AUTOMATE_MODAL', {
      type: ApplicationType.DEVICE_NODE,
      deviceId: controller?._id,
      reference: controller?._id,
      existing: (controller ? (controller?.applications || []) : (this.cloudApplications || [])).map(({ project }) => project?._id),
    });
  }

  goToDevice(event: any, deviceId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['../../device-manager', 'device', deviceId], { relativeTo: this.route });
  }

  closeEditSectionForm() {
    this.isContextMenuVisible = false;
    this.editStationMode = false;
  }

  updateStation(updatedStation: any) {
    this.station = updatedStation;
  }

  public onRemoveDevice(event: Event, deviceId: string, controller?: any): void {
    this.stopEvent(event);
    this.modalService.openGenericConfirm({
      text: 'Device will be removed from the organization. Are you sure that you want to remove device?',
      headlineText: 'Remove device',
      confirmText: 'Remove',
      creationConfirm: true,
      callback: confirm => {
        if (confirm) {
          if (controller) {
            this.removeDeviceFromController(deviceId, controller);
          } else {
            this.removeDevice(deviceId);
          }
        }
      }
    });
  }

  public onRemoveController(event: Event, controller: Device): void {
    this.stopEvent(event);
    this.activeController = null;
    this.modalService.openGenericConfirm({
      text: 'Controller and all linked devices will be deleted from the organization at all. To add them again you will need to go through device registration process again.',
      headlineText: 'Are you sure you want to delete the controller?',
      confirmText: 'Delete device',
      creationConfirm: true,
      callback: confirm => {
        if (confirm) {
          this.removeControllerFormOrg(controller);
        }
      }
    });
  }

  onUnlinkController(event: Event, controller: Device): void {
    this.stopEvent(event);
    this.activeController = null;
    this.modalService.openGenericConfirm({
      text: 'Controller and all linked devices will be moved to infrastructure level and you will be able to use this controller in another station within the infrastructure.',
      headlineText: 'Are you sure you want to unlink the controller from the station?',
      confirmText: 'Unlink the device',
      creationConfirm: true,
      callback: confirm => {
        if (confirm) {
          this.unlinkController(controller);
        }
      }
    });
  }

  removeControllerFormOrg(controller: Device) {
    this.isLoading = true;
    const reference = controller.station || controller.infrastructure;
    this.stationsRestService.removeController(controller.station, {
      controllerId: controller._id,
      reference
    }).subscribe(() => {
      this.controllers = this.controllers.filter((c: Device) => c._id !== controller._id);
      this.filterAppsByType(this.controllers);
      this.isLoading = false;
    });
  }

  public unlinkController(controller: Device): void {
    this.isLoading = true;
    this.stationsRestService.unlinkController(controller.station, { controller }).subscribe(() => {
      this.controllers = this.controllers.filter((c: Device) => c._id !== controller._id);
      this.filterAppsByType(this.controllers);
      this.isLoading = false;
    });
  }

  public removeDevice(deviceId: string): void {
    this.isLoading = true;
    forkJoin([
      this.removeDeviceFromGraph(deviceId, this.infrastructureId, 'STATION', this.station._id),
      this.moveDeviceToInfrastructure(deviceId),
    ]).subscribe(() => {
        this.onSuccessfulRemovedDevice(deviceId);
      },
      (error: Error) => {
        this.onErrorRemovedDevice(error);
      });
  }

  public removeDeviceFromController(deviceId: string, controller: any): void {
    this.isLoading = true;
    forkJoin([
      this.removeDeviceFromGraph(deviceId, undefined, 'CONTROLLER', controller._id),
      this.removeDeviceFromDeviceManager(deviceId)
    ]).subscribe(() => {
        this.onSuccessfulRemovedDevice(deviceId, controller);
      },
      (error: Error) => {
        this.onErrorRemovedDevice(error);
      });
  }

  public getFloorNumber(floorNumber: number): string {
    return getFormattedFloorNumber(floorNumber);
  }

  onSuccessfulRemovedDevice(deviceId: string, controller?: any) {
    if (controller && controller?.devices) {
      controller.devices = controller.devices.filter(({ _id }) => _id !== deviceId);
    } else {
      this.devicesWithoutController = this.devicesWithoutController.filter(({ _id }) => _id !== deviceId);
    }
    this.toaster.success('Device successfully removed!');
    this.isLoading = false;
  }

  onErrorRemovedDevice(error: Error) {
    this.toaster.error(error.message || 'Unable to remove device');
    this.isLoading = false;
  }

  moveDeviceToInfrastructure(deviceId) {
    return this.infrastructuresRestService.updateDevice(deviceId, {
      station: null,
      system: this.infrastructure?.system,
    } as Device);
  }

  removeDeviceFromGraph(deviceId: string, infrastructureId: string, subType: any, reference: string) {
    return this.graphsRestService.removeDevice({
      device: deviceId,
      reference,
      subType,
      infrastructure: infrastructureId,
    });
  }

  removeDeviceFromDeviceManager(deviceId: string) {
    return this.sharedService.deleteDevice(deviceId);
  }

  goToApplication(app: any): void {
    if (app?.status === NodeStatus.RUNNING || app?.status === NodeStatus.PENDING) {
      window.open(`${environment.production ? '/smart-infrastructure' : ''}/applications/dashboard/${this.coreId}/${app?.graphNodeId}`, '_blank');
    }
  }

  openControllerMenu(event: Event, controller: string) {
    this.stopEvent(event);

    if (this.activeController === controller) {
      this.activeController = null;
    } else {
      this.activeController = controller;
    }
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  showDeployOverlay(): void {
    this.applicationBuildService.setBuildStatus$({
      current: 'Deploying...',
      steps: ['Deploying...'],
      approximateTime: '40 seconds',
    });
  }

  updateAppToLatest(application: any) {
    this.subscriptions$.add(this.graphsRestService.deployNode({
      publish: true,
      updateToLatestRelease: true,
      graphNodeId: application.graphNodeId,
    }).pipe(this.handleError('Unable to update application')).subscribe(() => {
      application.isLatest = true;
      this.toaster.success('Successfully updated!');
    }));
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {
    }
  }

  filterAppsByType(controllers: any) {
    controllers.map(controller => {
      controller.robotApplications = controller.applications.filter(app => app.project.projectType === 'ROBOT');
      controller.uiApplications = controller.applications.filter(app => app.project.projectType === 'APP');
      controller.computeNodeApplications = controller.applications.filter(app => app.project.projectType === 'COMPUTE_NODE');
    });
  }
}
