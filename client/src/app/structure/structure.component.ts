import { SystemsRestService } from '@aitheon/device-manager';
import { AiWebClientService } from '@aitheon/ai-web-client-angular';
import {
  AuthService,
  DropdownAction,
  InfrastructureTaskType,
  ModalService,
  TaskModalService,
} from '@aitheon/core-client';
import {
  Area,
  Device as DeviceDB,
  Floor,
  Infrastructure,
  InfrastructureRestService,
  InfrastructureTask,
  InfrastructureTasksRestService,
  Station,
  Translation
} from '@aitheon/smart-infrastructure';
import { Graph, GraphsRestService } from '@aitheon/system-graph';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { event } from 'd3';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { filter, switchMap, take, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DeviceSubtype } from '../infrastructure-map/shared/enums/device-subtype.enum';
import {
  AreasService,
  AreaType,
  Coordinates,
  Device,
  DevicesService,
  InfrastructureMapComponent,
  InfrastructureMapMode,
  InfrastructureMapService,
  StationsService,
} from '../infrastructure-map';
import { InfrastructureService } from '../infrastructures/infrastructure.service';
import { DevicePanelComponent } from '../shared/components/device-panel/device-panel.component';
import { OrganizationsService } from '../shared/services/organizations.service';
import { WebSocketService } from '../shared/web-socket.service';
import { StructureService } from './structure.service';
import { getFormattedFloorNumber } from '../shared/utils/formatted-names';
import { Location} from '@angular/common';

@Component({
  selector: 'ai-structure',
  templateUrl: './structure.component.html',
  styleUrls: ['./structure.component.scss']
})
export class StructureComponent implements OnInit, OnDestroy {
  @ViewChild('map') map: InfrastructureMapComponent;
  @ViewChild('devicePanel') devicePanel: DevicePanelComponent;
  @ViewChild('layersButton') layersButton: ElementRef<any>;
  @ViewChild('areas') areas: ElementRef;

  @Input() dashboardView: boolean;
  @Input() isApplication: boolean;
  @Output() isAddFloorFormOpen: EventEmitter<boolean> = new EventEmitter<boolean>();
  mapOverlaySubscription$: Subscription;
  devicesSubscription$: Subscription;
  subscriptions$ = new Subscription();
  infrastructureId: string;
  infrastructure: Infrastructure;
  selectedFloor: Floor;
  floorForEdit: Floor;
  floorForReturn: Floor;
  showFloorsList: boolean = false;
  addFloorForm = false;
  shapes: any[] = [];
  mapDevices: any[] = [];
  filteredShapes: any[] = [];
  infrastructureTasks: InfrastructureTask[] = [];
  floorTasks: InfrastructureTask[] = [];
  loading: boolean = true;
  showAreaButtons: boolean;
  activeShape: Area | Station | DeviceDB;
  showAreaMenu = false;
  floorNumberFromQuery: number;
  editing: boolean;
  areaMenuPosition: {
    left: string,
    top: string,
  } = {} as any;
  legendOpen: boolean;
  iconShow: boolean;
  showDevicePanel: boolean = false;
  mapMode: InfrastructureMapMode;
  shapeValid: boolean;
  shapeStatus: {
    formValid: boolean,
    intersects: boolean,
  } = null;
  submitted: boolean;
  showAreasList: boolean = false;
  filterShapesForm: FormGroup;
  isProd: boolean;
  isInfrastructureMapVisible: boolean = true;
  mapTooglerTitle: string = 'Hide';
  public selectedDeviceInfo: {
    coordinates: Coordinates,
    device: any;
  };
  showFilters = false;
  layersButtonCoords: {
    left: string,
    top: string,
  } = {} as any;
  currentShapeType: string;
  currentShape: any;
  graphUrl: string;
  disableRightScroll = true;
  disableLeftScroll: boolean;
  currentUser: any;
  hideAreasNames: boolean = false;
  hideChargingStationsNames: boolean = false;
  hideStationsNames: boolean = false;
  currentOrganization: any;
  siKey: string;

  constructor(
    private cdr: ChangeDetectorRef,
    private infrastructureService: InfrastructureService,
    private infrastructureRestService: InfrastructureRestService,
    private infrastructureMapService: InfrastructureMapService,
    private stationsService: StationsService,
    private areasService: AreasService,
    private devicesService: DevicesService,
    private router: Router,
    private toastrService: ToastrService,
    private route: ActivatedRoute,
    private structureService: StructureService,
    private webSocketService: WebSocketService,
    private taskModalService: TaskModalService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private infrastructureTaskService: InfrastructureTasksRestService,
    private graphsRestService: GraphsRestService,
    private organizationsService: OrganizationsService,
    private aiWebClientService: AiWebClientService,
    private authService: AuthService,
    private systemsRestService: SystemsRestService,
    private modalService: ModalService,
    private location: Location,
  ) {
    router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.mapDevices = [];
        this.shapes = this.filteredShapes = [];
      }
    });

    this.isProd = environment.production;
  }

  @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(event: KeyboardEvent) {
    if (this.showAreaButtons) {
      this.exitEditMode();
    }
  }

  ngOnInit(): void {
    this.setCurrentUser();
    this.organizationsService.currentOrganization$.pipe(
      tap(currentOrg => {
        this.currentOrganization = currentOrg;
        this.organizationsService.setHeaders(this.graphsRestService);
        this.organizationsService.setHeaders(this.systemsRestService);
      }),
      take(1)).subscribe(() => {
      this.floorNumberFromQuery = +this.route.snapshot.queryParams.floor;
      this.buildSearchForm();
      this.loadData();
      this.listenToMapMode();
      this.listenToAddTaskButtonClick();
      this.listenToShapeSelection();
      this.listenToShapeStatusChange();
      this.listenToShapeDropdownAction();
      this.listenToDeviceSelect();
      this.setDefaultFloorMapState();
    });

    this.infrastructureMapService.mapClicked.subscribe(() => {
      if (!this.mapMode && !this.editing && event.target && event.target.classList.contains('map-background')) {
        this.activeShape = null;
      }
    });

    this.aiWebClientService.webClientLoaded$.pipe(filter(loaded => loaded)).subscribe(() => {

      if (!this.dashboardView) {
        document.querySelector('.aitheon-drawer-closed').classList.add('aitheon-drawer-closed--structure-positioning');
        document.querySelector('body').classList.add('overflow-hidden');
      } else {
        document.querySelector('body').classList.remove('overflow-hidden');
      }
    });
  }

  setCurrentUser(): void {
    this.authService.currentUser.pipe(take(1)).subscribe(user => {
      this.currentUser = user;
      this.siKey = 'siUserSettings__' + this.currentUser?._id;
    });
  }

  getShowProgressValueFromLocalStorage(): boolean {
    const showProgressJSON = localStorage.getItem(this.currentUser?._id);
    const showProgress = showProgressJSON ? JSON.parse(showProgressJSON)?.showTaskProgress : undefined;
    this.areasService.showTasksProgress(showProgress);
    return showProgress;
  }

  buildSearchForm() {
    const showProgress = this.getShowProgressValueFromLocalStorage();
    this.filterShapesForm = this.fb.group({
      searchText: '',
      robots: [{ value: true, disabled: false }],
      areas: [{ value: true, disabled: false }],
      chargingStations: [{ value: true, disabled: false }],
      waypoints: [{ value: false, disabled: true }],
      anchors: [{ value: true, disabled: false }],
      stations: [{ value: true, disabled: false }],
      tags: [{ value: true, disabled: false }],
      camera: [{ value: true, disabled: false }],
      progress: [{ value: typeof showProgress === 'boolean' ? showProgress : true, disabled: false }],
    });
    this.filterShapesForm.valueChanges.subscribe(form => {
      let search = form.searchText.toLowerCase();

      this.filterShapes(form, search);
    });
    this.onProgressChecked();
  }

  onProgressChecked(): void {
    this.areasService.showTasksProgress(true);
    this.subscriptions$.add(this.filterShapesForm.get('progress')?.valueChanges.subscribe(showProgress => {
      this.areasService.showTasksProgress(showProgress);
      const data = JSON.stringify({
        showTaskProgress: showProgress,
      });
      localStorage.setItem(this.currentUser?._id, data);
    }));
  }

  filterShapes(form, search) {

    this.filteredShapes = [...this.shapes];

    if (search.length > 1) {
      this.filteredShapes = this.shapes.filter(shape => {
        if (form.searchText && !shape.name.toLowerCase().includes(search)) {
          return false;
        }
        return shape;
      });
    }

    let testArr = [];

    Object.keys(form).forEach(e => {
      if (form[e] === true) {
        switch (e) {
          case 'areas':
            this.filteredShapes.map(item => {
              if (item.type === 'TARGET' || item.type === 'RESTRICTED') {
                testArr.push(item);
              }
            });
            break;
          case 'chargingStations':
            this.filteredShapes.map(item => {
              if (item.type === 'CHARGING' || item.type === 'CHARGING_DOCK' || item.type === 'CHARGING_TRACK') {
                testArr.push(item);
              }
            });
            break;
          case 'anchors':
            this.filteredShapes.map(item => {
              if (item.subType === 'ANCHOR') {
                testArr.push(item);
              }
            });
            break;
          case 'robots':
            this.filteredShapes.map(item => {
              if (item.subType === DeviceSubtype.ROBOT) {
                testArr.push(item);
              }
            });
            break;
          case 'tags':
            this.filteredShapes.map(item => {
              if (item.subType === DeviceSubtype.TAG) {
                testArr.push(item);
              }
            });
            break;
          case 'stations':
            this.filteredShapes.map(item => {
              if (item.type === 'WORK') {
                testArr.push(item);
              }
            });
            break;
          case 'camera':
            this.filteredShapes.map(item => {
              if (item.subType === 'CAMERA') {
                testArr.push(item);
              }
            });
            break;
        }
      }
    });

    this.filteredShapes = testArr;
  }

  loadData() {
    this.loading = true;
    this.subscriptions$.add(this.infrastructureService.infrastructureId.subscribe(id => {
      this.infrastructureId = id;
      this.loadInfrastructure();
    }));
  }

  setCoreURL(): void {
    this.subscriptions$.add(this.graphsRestService.getReferenceType(
      this.dashboardView ? this.infrastructureId : this.selectedFloor?._id,
      this.dashboardView ? 'INFRASTRUCTURE' : 'FLOOR'
    ).subscribe((graph: Graph) => {
      if (graph && graph._id) {
        this.graphUrl = `/system-graph/graphs/organization/service/SMART_INFRASTRUCTURE/sub-graph/${graph._id}`;
      }
    }));
  }

  openCore() {
    if (this.graphUrl) {
      window.open(this.graphUrl, '_blank');
    }
  }

  loadInfrastructure(): void {
    this.subscriptions$.add(this.infrastructureRestService.getById(this.infrastructureId).subscribe(infrastructure => {
        this.infrastructure = infrastructure;

        this.loadInfrastructureTasks();
        this.structureService.setInfrastructure(infrastructure);

        if (this.infrastructure.floors && this.infrastructure.floors.length) {
          this.selectedFloor = this.floorNumberFromQuery
            ? this.infrastructure.floors.find(f => f.number === +this.floorNumberFromQuery)
            : this.infrastructure.floors.sort((a, b) => a.number - b.number)[0];

          this.structureService.setCurrentFloor(this.selectedFloor);
          this.loadFloorShapes();
        } else {
          this.shapes = this.filteredShapes = [];
          this.loading = false;
        }
        this.setCoreURL();
      },
      (error) => {
        this.toastrService.error('Unable to load Infrastructure');
      }));
  }

  loadInfrastructureTasks(): void {
    this.subscriptions$.add(this.infrastructureTaskService.listByInfrastructure(this.infrastructure._id).subscribe(tasks => {
      this.infrastructureTasks = tasks;
      this.setFloorTasks();
    }));
  }

  setFloorTasks(): void {
    this.floorTasks = this.infrastructureTasks?.filter(task => task.floor as any === this.selectedFloor?._id);
  }

  loadFloorShapes(): void {
    this.structureService.getFloorShapes(this.selectedFloor._id).subscribe(([areas, stations, devices]) => {
      devices = devices.map((device: DeviceDB) => {
        return {
          ...device,
          subType: device.type.name
        };
      });
      if (areas && stations) {
        const shapes = [
          ...areas,
          ...stations,
          ...devices,
          ...this.mapDevices,
        ];

        this.shapes = this.filteredShapes = this.getShapesSettings(shapes).sort(
          (prev, next) => (+new Date(prev.updatedAt) - +new Date(next.updatedAt))
        );
        this.loading = false;
      }
    });
    this.listenToDevicesPosition();
  }

  getShapesSettings(shapes: any[]) {
    const siUserSettingsJSON = localStorage.getItem(this.siKey);
    let siUserSettings;
    let arr = [];

    if (siUserSettingsJSON) {
      siUserSettings = JSON.parse(siUserSettingsJSON);

      const orgIndex = siUserSettings?.organizations.findIndex(org => org.id === this.currentOrganization._id);

      if (orgIndex < 0) {
        arr = shapes;
      } else {
        const org = siUserSettings?.organizations[orgIndex];
        arr = shapes.map(shape => {
          let shapeShapeIndex = org?.shapesSettings?.findIndex(s => s.shape === shape._id);
          if (shapeShapeIndex >= 0) {
            shape = {
              ...shape,
              hideName: org?.shapesSettings[shapeShapeIndex].hideName
            };
          } else {
            shape = {
              ...shape,
              hideName: false
            };
          }
          return shape;
        });

        this.hideAreasNames = org.hideAreasNames;
        this.hideChargingStationsNames = org.hideChargingStationsNames;
        this.hideStationsNames = org.hideStationsNames;
      }
    } else {
      arr = shapes;
      siUserSettings = {
        organizations: [this.getCurrentOrgGroupSettings()],
      };
      localStorage.setItem(this.siKey, JSON.stringify(siUserSettings));
    }

    return arr;
  }

  listenToMapMode(): void {
    this.subscriptions$.add(this.infrastructureMapService.modeSetted.subscribe((mode) => {
      this.mapMode = mode;

      this.showAreaButtons = !!mode;
      if (this.showAreaButtons) {
        this.shapeValid = false;
        this.map?.hideTaskButton();
      }
    }));
  }

  listenToAddTaskButtonClick(): void {
    this.subscriptions$.add(this.infrastructureMapService.addTask.subscribe(areaId => {
      this.addTask(areaId);
    }));
  }

  listenToShapeSelection(): void {
    this.subscriptions$.add(this.areasService.areaSelected.subscribe(({ areaId }) => {
      this.onShapeSelected(areaId);
    }));
    this.subscriptions$.add(this.stationsService.stationSelected.subscribe(stationId => {
      this.onShapeSelected(stationId);
    }));
  }

  onShapeSelected(shapeId: string): void {
    this.activeShape = this.shapes.find(({ _id }) => _id === shapeId);

    if (!this.dashboardView && this.showAreasList) {
      document.getElementById(this.activeShape._id).scrollIntoView({ block: 'center' });
      const index = this.shapes.indexOf(this.activeShape) + 1;
      document.querySelector('.areas').scrollTo({ left: (index * 150) - window.innerWidth / 2, behavior: 'smooth' });
    }
  }

  listenToShapeStatusChange(): void {
    this.subscriptions$.add(this.infrastructureMapService.shapeIntersectionChanged.subscribe(({ intersects }) => {
      this.updateShapeValidity({ ...this.shapeStatus, intersects });
    }));
    this.subscriptions$.add(this.infrastructureMapService.areaFormUpdated.subscribe(({ value }) => {
      if (value.device) {
        this.currentShape = value.device;
      }
      this.updateShapeValidity({ ...this.shapeStatus, formValid: value.isFormValid });
    }));
  }

  listenToShapeDropdownAction(): void {
    this.subscriptions$.add(this.infrastructureMapService.shapeDropdownActionTriggered.subscribe(({ action, shapeId }) => {
      switch (action) {
        case DropdownAction.ADD_TASK:
          this.addTask(shapeId);
          break;
        case DropdownAction.EDIT:
          if (this.dashboardView) {
            this.router.navigate(['infrastructure', this.infrastructure?._id, 'structure'], { queryParams: {editingShapeId: shapeId} });
          } else {
            this.editShape(shapeId);
          }
          break;
        case DropdownAction.REMOVE:
          this.removeArea(shapeId);
          break;
        default:
          break;
      }
    }));
  }

  listenToDeviceSelect(): void {
    this.subscriptions$.add(this.devicesService.deviceSelected$.subscribe(({ deviceId, coordinates }) => {
      const device = this.shapes.find((device) => device._id === deviceId && !device.readonly);
      this.activeShape = device;
      
      if (device && [DeviceSubtype.ROBOT, DeviceSubtype.TAG].includes(device.subType)) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        this.selectedDeviceInfo = {
          device,
          coordinates,
        };
      }
    }));
  }

  unsubscribeFromDevicesSubscription(): void {
    if (this.devicesSubscription$) {
      try {
        this.devicesSubscription$.unsubscribe();
        this.devicesSubscription$ = null;
      } catch (e) {
      }
    }
  }

  listenToDevicesPosition(): void {
    this.unsubscribeFromDevicesSubscription();
    let devicesIds = [];
    this.devicesSubscription$ = this.searchFloorDevices().pipe(switchMap(devices => {
      devicesIds = (devices || []).map(({ _id }) => _id);
      return this.webSocketService.positionChanged.asObservable();
    })).pipe(filter(({ device }) => devicesIds.includes(device)))
      .subscribe(({ device: deviceId, position }) => {
        const device = this.mapDevices.find(({ _id }) => _id === deviceId);
        const deviceView = this.infrastructureMapService.getShapeById(deviceId) as Device;
        if (deviceView) {
          deviceView.moveTo(position);
          if (this.selectedDeviceInfo && this.selectedDeviceInfo.device?._id === deviceId) {
            this.selectedDeviceInfo = {
              ...this.selectedDeviceInfo,
              coordinates: deviceView.getClientCoordinates(position),
            };
          }
          if (device) {
            device.pose = position;
          }
        } else {
          this.addDeviceOnMap(deviceId, position);
        }
      });
  }

  private addDeviceOnMap(deviceId: string, position: Translation): void {
    this.subscriptions$.add(this.infrastructureRestService.getDeviceById(deviceId).subscribe(deviceRes => {
        const device = {
          ...deviceRes,
          type: 'DEVICE',
          subType: deviceRes?.type?.name === DeviceSubtype.ROBOT ? DeviceSubtype.ROBOT : DeviceSubtype.TAG,
          pose: position,
        } as any;
        this.mapDevices.push(device);
        if (!this.shapes.find(({ _id }) => _id === deviceId)) {
          if (
            device.subType === DeviceSubtype.TAG && this.getFilterFormControl('tags')?.value ||
            device.subType === DeviceSubtype.ROBOT && this.getFilterFormControl('robots')?.value
          ) {
            this.filteredShapes = [...this.filteredShapes, device];
          }
          this.shapes = [...this.shapes, device];
        }
      },
      error => {
        this.toastr.error(error.message || 'Unable to load device data.');
      }));
  }

  private getFilterFormControl(controlName: string): FormControl {
    return this.filterShapesForm?.get(controlName) as FormControl;
  }

  private searchFloorDevices() {
    return this.infrastructureRestService.searchDevices({
      infrastructure: this.infrastructureId,
      floors: [this.selectedFloor._id],
    });
  }

  updateShapeValidity({ formValid, intersects }: { formValid: boolean, intersects: boolean }): void {
    this.shapeStatus = {
      formValid,
      intersects,
    };
    this.shapeValid = !!formValid && !intersects;
  }

  onShapeAdd(data): void {
    const { type } = data;
    if (type === 'WORK') {
      this.currentShapeType = type;
      this.updateShapeValidity({ formValid: true, intersects: false });
    }
    if (type === 'DEVICE') {
      this.currentShapeType = data?.shape?.dbData?.subType;
    }
  }

  setActiveArea(area: Area, e: Event): void {
    this.map?.hideTaskButton();
    if (this.showAreaButtons) {
      return;
    }
    
    this.activeShape = area;
    this.infrastructureMapService.highlightShape(this.activeShape._id);
    this.showAreaMenu = false;
    document.getElementById(this.activeShape._id).scrollIntoView({ block: 'center' });
    const index = this.shapes.indexOf(this.activeShape) + 1;
    document.querySelector('.areas').scrollTo({ left: (index * 150) - window.innerWidth / 2, behavior: 'smooth' });
  }

  toggleFloorsList(event: Event): void {
    this.stopEvent(event);
    this.showFloorsList = !this.showFloorsList;
  }

  hideFloorsList(event?: any): void {
    const isClickedOnDropdownButton = event?.path?.some(element => element?.classList?.contains('structure__floor-name'));

    if (!isClickedOnDropdownButton) {
      this.showFloorsList = false;
    }
  }

  onFloorSelected(floor: Floor): void {
    this.loading = true;
    this.router.navigate([], { relativeTo: this.route, queryParams: { floor: floor.number } });
    this.shapes = this.filteredShapes = [];
    this.mapDevices = [];
    this.selectedFloor = floor;
    this.showDevicePanel = false;
    this.infrastructureMapService.setMode(null);
    this.structureService.setCurrentFloor(this.selectedFloor);
    this.setFloorTasks();
    this.loadFloorShapes();
    this.hideFloorsList();
    this.setCoreURL();
  }

  onMapDimensionChange(): void {
    if (this.selectedDeviceInfo) {
      this.selectedDeviceInfo = null;
    }
  }

  addTask(areaId?: string): void {
    this.taskModalService.openModal({
      service: environment.service,
      taskType: InfrastructureTaskType.GO_TO,
      smartInfrastructureTaskConfig: {
        infrastructure: this.infrastructureId,
        floor: this.selectedFloor._id,
        area: areaId
      }
    });
  }

  removeArea(shapeId: string): void {
    this.map?.hideTaskButton();
    this.modalService.openGenericConfirm({
      text:
        `Are you sure you want to remove this ${(this.activeShape.type === 'CHARGING' || this.activeShape.type === 'CHARGING_DOCK' || 
                                                 this.activeShape.type === 'CHARGING_TRACK' || this.activeShape.type === 'WORK')
          ? 'station'
          : ((this.activeShape as DeviceDB).subType === 'CAMERA' || (this.activeShape as DeviceDB).subType === 'ANCHOR')
            ? 'device'
            : 'area'}?`,
      headlineText: `Remove ${(this.activeShape.type === 'CHARGING' || this.activeShape.type === 'CHARGING_DOCK' || 
                               this.activeShape.type === 'CHARGING_TRACK' || this.activeShape.type === 'WORK') ? 'Station' :
        ((this.activeShape as DeviceDB).subType === 'CAMERA' || (this.activeShape as DeviceDB).subType === 'ANCHOR') ? 'Device' : 'Area'}?`,
      hideNoButton: false,
      confirmText: `Remove ${(this.activeShape.type === 'CHARGING' || this.activeShape.type === 'CHARGING_DOCK' || 
                              this.activeShape.type === 'CHARGING_TRACK' ||this.activeShape.type === 'WORK') ? 'Station' :
        ((this.activeShape as DeviceDB).subType === 'CAMERA' || (this.activeShape as DeviceDB).subType === 'ANCHOR') ? 'Device' : 'Area'}`,
      callback: (confirm) => {
        if (confirm) {
          if (this.activeShape.type === 'CHARGING' || this.activeShape.type === 'CHARGING_DOCK' ||
              this.activeShape.type === 'CHARGING_TRACK' || this.activeShape.type === 'WORK') {
            this.structureService.removeStation(shapeId).subscribe((res) => {
                this.infrastructureMapService.removeShape(shapeId);
                this.shapes = this.filteredShapes = this.shapes.filter(shape => shape._id !== shapeId);
                this.toastr.success('Station successfully removed');
              },
              (err) => {
                this.toastrService.error(err.message || 'Unable to remove station');
              });
            return;
          } else if ((this.activeShape as DeviceDB).subType === 'CAMERA' || (this.activeShape as DeviceDB).subType === 'ANCHOR') {
            this.structureService.updateDevice(shapeId, true).subscribe((res) => {
                this.infrastructureMapService.removeShape(shapeId);
                this.shapes = this.filteredShapes = this.shapes.filter(shape => shape._id !== shapeId);
                this.toastr.success('Device successfully removed');
              },
              (err) => {
                this.toastrService.error(err.message || 'Unable to remove station');
              });
            return;
          }
          this.structureService.removeArea(shapeId).subscribe(() => {
              this.infrastructureMapService.removeShape(shapeId);
              this.shapes = this.filteredShapes = this.shapes.filter(area => area._id !== shapeId);
              this.toastr.success('Area successfully removed');
            },
            (err) => {
              this.toastrService.error(err.message || `Unable to remove area`);
            });
        }
      }
    });
  }

  goAddFloorForm(type?: string): void {
    this.devicePanel.closePanel();

    if (type === 'NEW_FLOOR') {
      this.floorForEdit = null;
      this.floorForReturn = this.selectedFloor;
    }

    this.addFloorForm = !this.addFloorForm;
    this.isAddFloorFormOpen.emit(this.addFloorForm);
  }

  closeAddFloorModalForm(updatedInfrastructureData: {infrastructure: Infrastructure, floorNumber: number}) {
    this.router.navigate(['infrastructure', this.infrastructure._id, 'structure'], { queryParamsHandling: 'preserve' });
    this.floorNumberFromQuery = updatedInfrastructureData.floorNumber;
    this.addFloorForm = false;
    this.isAddFloorFormOpen.emit(this.addFloorForm);
    this.loadData();
    this.floorForEdit = null;
    this.floorForReturn = null;
  }

  closeAddFloorModalOnDashboard(updatedInfrastructureData?: {infrastructure: Infrastructure, floorNumber: number}) {
    this.addFloorForm = false;
    this.isAddFloorFormOpen.emit(this.addFloorForm);
    this.router.navigate(['infrastructure', this.infrastructure._id, 'dashboard'], { queryParamsHandling: 'preserve' });
  }

  exitEditMode(): void {
    if (this.editing) {
      this.infrastructureMapService.showAreaForm(null);
      this.infrastructureMapService.cancelEditing();
      this.showAreaButtons = false;
      this.editing = false;
      return;
    }

    if (this.infrastructureMapService.getNewShapeDrawing()) {
      this.modalService.openGenericConfirm({
        text: `Are you sure you want to close? If confirmed, the element you created will be deleted.`,
        headlineText: 'Cancel creation',
        hideNoButton: false,
        creationConfirm: true,
        confirmText: 'Confirm', callback: (confirm) => {
          if (confirm) {
            this.infrastructureMapService.setHint();
            this.infrastructureMapService.showAreaForm(null);
            this.showAreaButtons = false;
            this.editing = false;
            this.infrastructureMapService.setMode(null);
            this.infrastructureMapService.removeActiveShape();
            this.infrastructureMapService.setNewShapeDrawing(false);
            this.currentShapeType = '';
          }
        }
      });
      return;
    }

    this.infrastructureMapService.showAreaForm(null);
    this.infrastructureMapService.removeActiveShape();
    this.infrastructureMapService.setMode(null);
    this.showAreaButtons = false;
  }

  saveActiveShape(shape?: Area | Station | DeviceDB): void {
    if (!this.shapeValid || this.submitted) {
      return;
    }

    if (this.editing && this.activeShape?.type === 'WORK') {
      this.saveActiveStation();
      return;
    }

    if (this.currentShapeType === 'WORK') {
      this.putStationOnMap();
      this.currentShapeType = null;
      return;
    }

    if (
      this.editing &&
      this.activeShape &&
      ((this.activeShape as DeviceDB).subType === 'CAMERA' || (this.activeShape as DeviceDB).subType === 'ANCHOR')
    ) {
      this.updateDevice(this.activeShape);
      return;
    }

    if (this.currentShapeType === 'CAMERA' || this.currentShapeType === 'ANCHOR') {
      return this.addStaticDeviceToMap();
    }

    this.submitted = true;
    this.infrastructureMapService.showAreaForm(null);
    if (this.editing) {
      if (this.activeShape?.type === 'CHARGING' || this.activeShape?.type === 'CHARGING_DOCK' || this.activeShape?.type === 'CHARGING_TRACK') {
        this.saveActiveStation();
        return;
      }
      this.structureService.saveEditedArea().subscribe(area => {
          this.editing = false;
          this.showAreaButtons = false;
          this.submitted = false;
          const updatedArea = this.shapes.find(({ _id }) => _id === area._id);
          updatedArea.name = area.name;
          updatedArea.shape.styling.backgroundColor = area.shape.styling.backgroundColor;

          if (!area) {
            this.toastrService.error('Unable to update area');
          } else {
            this.toastrService.success('Area Updated!');
          }
        },
        (err) => {
          this.submitted = false;
          this.showAreaButtons = false;
          this.toastrService.error(err.message || 'Unable to update area');
        });
      return;
    }
    let request$ = this.structureService.saveActiveArea.bind(this.structureService) as any;
    if (this.mapMode === InfrastructureMapMode.CHARGING_STATION_DOCK ||
        this.mapMode === InfrastructureMapMode.CHARGING_STATION_TRACK ||
        this.mapMode === InfrastructureMapMode.CHARGING_STATION) {
      request$ = this.structureService.saveActiveStation.bind(this.structureService);
    }
    this.subscriptions$.add(request$().subscribe((shape) => {
      this.showAreaButtons = false;
      this.submitted = false;

      if (!shape) {
        this.toastrService.error('Unable to create Shape');
        return;
      }

      this.shapes = this.filteredShapes = [...this.shapes, shape];
      if (shape.type !== 'CHARGING' && shape.type !== 'CHARGING_DOCK' && shape.type !== 'CHARGING_TRACK' ) {
        this.toastrService.success('Area was successfully created');
      } else {
        this.toastrService.success('Charge station successfully created!');
      }
    }, () => {
      this.submitted = false;
      this.showAreaButtons = false;
      this.toastrService.error('Unable to create Shape');
    }));
  }

  addStaticDeviceToMap(): void {
    this.structureService.updateDevice(this.currentShape._id).subscribe((device) => {
        this.showAreaButtons = false;
        this.submitted = false;
        this.infrastructureMapService.showAreaForm(null);
        this.infrastructureMapService.setMode(null);
        device.subType = device ?.type ?.name;
        this.shapes = [...this.shapes, device];
        this.filteredShapes = [...this.filteredShapes, device];
      },
      e => {
        this.infrastructureMapService.setMode(null);
        this.toastrService.error('Unable to add device');
      });
  }

  putStationOnMap(): void {
    this.structureService.putStationOnMap().subscribe(data => {
        if (data) {
          this.shapes = [...this.shapes, data];
          this.filteredShapes = [...this.filteredShapes, data];
          this.activeShape = data;
          this.showAreaButtons = false;
          this.submitted = false;
          this.infrastructureMapService.setMode(null);
          this.infrastructureMapService.showAreaForm(null);
          this.toastrService.success('Station Added!');
        } else {
          this.infrastructureMapService.setMode(null);
          this.showAreaButtons = false;
          this.toastrService.error('Unable to add station');
        }
        this.infrastructureMapService.setActiveShape(null);
      },
      () => {
        this.showAreaButtons = false;
        this.submitted = false;
        this.infrastructureMapService.showAreaForm(null);
        this.infrastructureMapService.setMode(null);
        this.toastrService.error('Unable to add station');
      });
  }

  updateDevice(device): void {
    this.structureService.updateDevice(device._id).subscribe(data => {
        if (data) {
          this.activeShape = data;
          this.showAreaButtons = false;
          this.submitted = false;
          this.editing = false;
          this.infrastructureMapService.setMode(null);
          this.infrastructureMapService.showAreaForm(null);
          this.toastrService.success('Device updated');
        } else {
          this.infrastructureMapService.setMode(null);
          this.showAreaButtons = false;
          this.toastrService.error('Unable to update station');
        }
      },
      () => {
        this.showAreaButtons = false;
        this.submitted = false;
        this.editing = false;
        this.infrastructureMapService.showAreaForm(null);
        this.infrastructureMapService.setMode(null);
        this.toastrService.error('Unable to update station');
      });
  }

  saveActiveStation(): void {
    this.structureService.saveActiveStation().subscribe(station => {      
        this.activeShape.name = station.name;
        this.editing = false;
        this.showAreaButtons = false;
        this.submitted = false;
        this.toastrService.success('Station updated!');
        this.infrastructureMapService.setActiveShape(null);
      },
      error => {
        this.toastrService.error('Unable to update station');
        this.editing = false;
        this.submitted = false;
        this.showAreaButtons = false;
      });
  }

  switchToAddStationMode(): void {
    const mode = InfrastructureMapMode.CHARGING_STATION_DOCK;
    this.infrastructureMapService.setMode(mode);
  }

  onShowAreasToolbar(event: Event): void {
    this.stopEvent(event);
    this.showFloorsList = false;
  }

  stopEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  openAreaMenu(e: Event) {
    const target = e.target as any;
    const rect = target.getBoundingClientRect();

    const isDevice = (this.activeShape as DeviceDB).subType === 'ANCHOR' ||
      (this.activeShape as DeviceDB).subType === 'CAMERA' ||
      (this.activeShape as DeviceDB).subType === 'TAG';

    this.areaMenuPosition = {
      left: `${rect.left - 127}px`,
      top: `${(rect.top - (this.activeShape.type === AreaType.RESTRICTED || (this.activeShape.type as any) === 'CHARGING' ||
                           (this.activeShape.type as any) === 'CHARGING_DOCK' || (this.activeShape.type as any) === 'CHARGING_TRACK' ||
                           (this.activeShape.type as any) === 'WORK' || isDevice ? 97 : 133))}px`
    };

    this.stopEvent(e);
    if (this.editing) {
      return;
    }
    this.showAreaMenu = !this.showAreaMenu;
  }

  editShape(shapeId: string): void {
    this.infrastructureMapService.setStartDrawing(true);
    this.infrastructureMapService.transparentize(shapeId);
    this.editing = true;
    this.showAreaMenu = false;

    if (this.activeShape?.type === 'CHARGING' || this.activeShape?.type === 'CHARGING_DOCK' ||
        this.activeShape?.type === 'CHARGING_TRACK' || this.activeShape?.type === 'WORK') {
      this.stationsService.onEditStation(shapeId);
    } else if ((this.activeShape as DeviceDB)?.subType === 'CAMERA' ||
      (this.activeShape as DeviceDB)?.subType === 'TAG' ||
      (this.activeShape as DeviceDB)?.subType === 'ANCHOR') {
      this.devicesService.onEditDevice(shapeId);
    } else {
      this.areasService.onEditArea(shapeId);
    }
    this.showAreaButtons = true;
    this.updateShapeValidity({ intersects: false, formValid: true });
    this.map?.hideTaskButton();
  }

  toggleLegend(type: string, e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (type === 'OPEN') {
      this.legendOpen = true;

      const timeout = setTimeout(() => {
        this.iconShow = true;
        clearTimeout(timeout);
      }, 200);
    } else {
      this.legendOpen = false;
      this.iconShow = false;
    }
  }

  editFloor() {
    this.floorForEdit = this.selectedFloor;
    this.addFloorForm = true;
    document.querySelector('body').classList.remove('overflow-hidden');
  }

  togglePanel() {
    if (!this.showDevicePanel && !document.querySelector('html').classList.contains('overflow-hidden')) {
      document.querySelector('html').classList.add('overflow-hidden');
    } else {
      document.querySelector('html').classList.remove('overflow-hidden');
    }

    this.showDevicePanel = !this.showDevicePanel;
  }

  closePanel() {
    this.showDevicePanel = false;
    document.querySelector('html').classList.remove('overflow-hidden');
  }

  openList() {
    this.showAreasList = !this.showAreasList;

    if (this.showAreasList) {
      document.querySelector('.aitheon-drawer-closed').classList.add('fix-customer-support-position');
    } else {
      document.querySelector('.aitheon-drawer-closed').classList.remove('fix-customer-support-position');
    }
  }

  closeEmployeeInfo(): void {
    this.selectedDeviceInfo = null;
    this.cdr.detectChanges();
  }

  public getDashboardInfrastructureMapStyles(): any {
    return this.dashboardView ? { width: '1224px', height: '100%' } : { width: '100vw', height: '100%' };
  }

  public toggleMapView(): void {
    this.isInfrastructureMapVisible = !this.isInfrastructureMapVisible;
    this.mapTooglerTitle = this.isInfrastructureMapVisible ? 'Hide' : 'Show';

    const floorMapState = this.isInfrastructureMapVisible ? 'visible' : 'hidden';

    localStorage.setItem('floorMapState', floorMapState);
  }

  public getFloorNumber(floorNumber: number): string {
    return getFormattedFloorNumber(floorNumber);
  }

  toggleFilters() {
    const coords = this.layersButton.nativeElement.getBoundingClientRect();
    this.layersButtonCoords = {
      left: `${coords.x.toString()}px`,
      top: `${(coords.y - 404).toString()}px`,
    };
    this.showFilters = !this.showFilters;
  }

  private setDefaultFloorMapState(): void {
    const savedFloorMapState = localStorage.getItem('floorMapState');

    if (savedFloorMapState && this.dashboardView) {
      this.isInfrastructureMapVisible = savedFloorMapState === 'visible';
    } else {
      this.isInfrastructureMapVisible = true;
    }

    if (this.dashboardView) {
      this.mapTooglerTitle = this.isInfrastructureMapVisible ? 'Hide' : 'Show';
    }
  }

  moveLeft() {
    this.disableRightScroll = true;
    this.areas.nativeElement.scrollTo({
      left: (this.areas.nativeElement.scrollLeft - 150),
      behavior: 'smooth'
    });
  }

  moveRight() {
    this.disableLeftScroll = true;
    this.areas.nativeElement.scrollTo({
      left: (this.areas.nativeElement.scrollLeft + 150),
      behavior: 'smooth'
    });
  }

  areasScrolled() {
    if (this.showAreaMenu === true) {
      this.showAreaMenu = false;
    }
    this.disableLeftScroll = this.areas.nativeElement.scrollLeft > 15;
    this.disableRightScroll = this.areas.nativeElement.scrollLeft <
      this.areas.nativeElement.scrollWidth - this.areas.nativeElement.clientWidth - 15;
  }

  onShapesRender(): void {
    this.listenToAreasOverlayChange();
    this.listenQueryParams();

    let timeout = setTimeout(() => {
      this.checkGroupShapesSettings();
      clearTimeout(timeout);
    });
  }

  checkGroupShapesSettings() {
    this.shapes?.forEach(shape => {
    if (this.hideAreasNames && (shape.type === 'TARGET' || shape.type === 'RESTRICTED')) {
      shape.hideName = true;

      if (this.filterShapesForm.get('areas').value) {
        this.infrastructureMapService.hideShapeName(shape._id);
      }
    }

    if (this.hideChargingStationsNames && (shape.type === 'CHARGING' || shape.type === 'CHARGING_DOCK' || shape.type === 'CHARGING_TRACK')) {
      shape.hideName = true;
      if (this.filterShapesForm.get('chargingStations').value) {
        this.infrastructureMapService.hideShapeName(shape._id);
      }
    }

    if (this.hideStationsNames && shape.type === 'WORK') {
      shape.hideName = true;

      if (this.filterShapesForm.get('stations').value) {
        this.infrastructureMapService.hideShapeName(shape._id);
      }
    }
   });
  }

  listenQueryParams() {
    if (this.route.snapshot.queryParamMap.get('editingShapeId')) {
      const editingShapeId = this.route.snapshot.queryParamMap.get('editingShapeId');
      this.infrastructureMapService.setActiveShape(editingShapeId);
      this.editShape(editingShapeId);
      this.location.replaceState(this.router.url.split('?')[0]);
      this.cdr.detectChanges();
    }
  }

  unsubscribeFromMapOverlaySubscription(): void {
    if (this.mapOverlaySubscription$) {
      this.mapOverlaySubscription$.unsubscribe();
    }
  }

  listenToAreasOverlayChange(): void {
    this.unsubscribeFromMapOverlaySubscription();
    this.mapOverlaySubscription$ = this.webSocketService.mapOverlay.asObservable().pipe(
      filter(({ floorId }) => {
        return floorId === this.selectedFloor?._id;
      })).subscribe(overlay => {
      const currentTask = this.floorTasks?.find(({ _id }) => _id === overlay?.taskId);
      if (currentTask) {
        this.areasService.setAreaOverlay(overlay, currentTask?.area?._id);
      }
    });
  }

  toggleAreaName(event: Event, shape: any) {
    this.stopEvent(event);

    if (!shape.hideName) {
      shape.hideName = true;
      this.infrastructureMapService.hideShapeName(shape._id);
    } else {
      shape.hideName = false;
      this.infrastructureMapService.showShapeName(shape._id);
    }

    const siUserSettingsJSON = localStorage.getItem(this.siKey);
    let siUserSettings = JSON.parse(siUserSettingsJSON);

    if (siUserSettings) {
      if (!siUserSettings.organizations) {
        siUserSettings.organizations = [];
      }
      const orgIndex = siUserSettings.organizations.findIndex(org => org.id === this.currentOrganization._id);

      if (orgIndex < 0) {
        siUserSettings.organizations.push(this.getCurrentOrgSettings(shape));
      } else {
        const org = siUserSettings.organizations[orgIndex];
        const shapeIndex = org.shapesSettings.findIndex(s => s.shape === shape._id);

        if (!org.shapesSettings) {
          org.shapesSettings = [];
        }

        if (shapeIndex < 0) {
          org.shapesSettings.push(this.getCurrentShapeSettings(shape));
        } else {
          org.shapesSettings[shapeIndex] = this.getCurrentShapeSettings(shape);
        }
      }

    } else {
      siUserSettings = {
        organizations: [this.getCurrentOrgSettings(shape)],
      };
    }

    localStorage.setItem(this.siKey, JSON.stringify(siUserSettings));
  }

  getCurrentOrgSettings(shape: any) {
    return {  id: this.currentOrganization._id, shapesSettings: [{ shape: shape._id, hideName: shape.hideName}] };
  }

  getCurrentOrgGroupSettings() {
    return {  id: this.currentOrganization._id,
              hideAreasNames: this.hideAreasNames,
              hideChargingStationsNames: this.hideChargingStationsNames,
              hideStationsNames: this.hideStationsNames,
              shapesSettings: [] };
  }

  getCurrentShapeSettings(shape: any) {
    return { shape: shape._id, hideName: shape.hideName};
  }

  toggleGroupNames(type: string, event: Event) {
    this.stopEvent(event);

    switch (type) {
      case 'AREAS':
      this.hideAreasNames = !this.hideAreasNames;
      this.shapes = this.shapes.map(shape => {
        if (shape.type === 'TARGET' || shape.type === 'RESTRICTED') {
          shape.hideName = this.hideAreasNames;
          if (!this.hideAreasNames) {
            this.infrastructureMapService.showShapeName(shape._id);
          } else {
            if (this.filterShapesForm.get('areas').value) {
              this.infrastructureMapService.hideShapeName(shape._id);
            }
          }
        }
        return shape;
      });
      break;

      case 'CHARGING':
      this.hideChargingStationsNames = !this.hideChargingStationsNames;
      this.shapes = this.shapes.map(shape => {
        if (shape.type === 'CHARGING' || shape.type === 'CHARGING_DOCK' || shape.type === 'CHARGING_TRACK') {
          shape.hideName = this.hideChargingStationsNames;
          if (!this.hideChargingStationsNames) {
            this.infrastructureMapService.showShapeName(shape._id);
          } else {
            if (this.filterShapesForm.get('chargingStations').value) {
              this.infrastructureMapService.hideShapeName(shape._id);
            }
          }
        }
        return shape;
      });
      break;

      case 'WORK':
      this.hideStationsNames = !this.hideStationsNames;
      this.shapes = this.shapes.map(shape => {
        if (shape.type === 'WORK') {
          shape.hideName = this.hideStationsNames;
          if (!this.hideStationsNames) {
            this.infrastructureMapService.showShapeName(shape._id);
          } else {
            if (this.filterShapesForm.get('stations').value) {
              this.infrastructureMapService.hideShapeName(shape._id);
            }
          }
        }
        return shape;
      });
      break;
    }

    this.checkOrgGroupSettings();
  }

  checkOrgGroupSettings() {
    const siUserSettingsJSON = localStorage.getItem(this.siKey);
    let siUserSettings = JSON.parse(siUserSettingsJSON);

    if (siUserSettings) {
      if (!siUserSettings.organizations) {
        siUserSettings.organizations = [];
      }

      const orgIndex = siUserSettings.organizations.findIndex(org => org.id === this.currentOrganization._id);

      if (orgIndex < 0)  {
        siUserSettings.organizations.push(this.getCurrentOrgGroupSettings());
      } else {
        siUserSettings.organizations[orgIndex] = {
          ...siUserSettings.organizations[orgIndex],
          ...this.getCurrentOrgGroupSettings()
        };
      }
    } else {
      siUserSettings = {
        organizations: [this.getCurrentOrgGroupSettings()],
      };
    }

    localStorage.setItem(this.siKey, JSON.stringify(siUserSettings));
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {}

    this.unsubscribeFromDevicesSubscription();
    this.unsubscribeFromMapOverlaySubscription();
    document.querySelector('.aitheon-drawer-closed')?.classList.remove('aitheon-drawer-closed--structure-positioning');
    document.querySelector('body').classList.remove('overflow-hidden');
  }
}
