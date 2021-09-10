import { Station, StationsRestService } from '@aitheon/smart-infrastructure';
import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { InfrastructureMapMode, InfrastructureMapService, StationsService } from '../../infrastructure-map';
import { FormControl } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { ApplicationType, ReferenceType, ApplicationsService } from "../../shared/services/applications.service";

export interface ToolbarStation extends Station {
  application?: any;
}

@Component({
  selector: 'ai-areas-toolbar',
  templateUrl: './areas-toolbar.component.html',
  styleUrls: [
    './areas-toolbar.component.scss',
  ]
})
export class AreasToolbarComponent implements OnInit, OnDestroy {
  @Input() infrastructureId: string;
  activeMode: InfrastructureMapMode;
  mapModeSubscription: Subscription;
  show: boolean = true;
  showRectangleTooltip: boolean = false;
  showPolygonTooltip: boolean = false;
  showRestrictedRectangleTooltip: boolean = false;
  showRestrictedPolygonTooltip: boolean = false;
  showChargingStationTooltip: boolean = false;
  stationsSearchControl: FormControl;
  stationsSearchControlSubscription$: Subscription;
  subscriptions$ = new Subscription();
  loading: boolean;

  rectangle = {
    title: 'Rectangle area tool',
    gif: 'assets/img/gif_tools/rectangle.gif',
    description: 'This tool allows you to set the rectangle working areas for the robot. For example, you can mark a specific area for the robot to disinfect on a regular basis.'
  }

  polygon = {
    title: 'Polygon working area',
    gif: 'assets/img/gif_tools/polygon.gif',
    description: 'This tool allows you to set different kinds of working areas of various complex polygon shapes for the robot.'
  }

  restrictedRectangle = {
    title: 'Rectangle restricted area',
    gif: 'assets/img/gif_tools/rectangle-restricted.gif',
    description: 'This tool allows you to set the rectangle restricted areas where the robot is not allowed to work. The robot will also not be allowed to build its routes through these areas.'
  }

  restrictedPolygon = {
    title: 'Polygon restricted area',
    gif: 'assets/img/gif_tools/polygon-restricted.gif',
    description: 'This tool allows you to set different kinds of restricted areas of various complex polygon shapes for the robot. The robot will not be allowed to work or build routes through these areas.'
  }

  chargingStation = {
    title: 'Charging Station',
    gif: 'assets/img/gif_tools/charge-station.gif',
    description: 'This tool allows you to add a charging station for the robot on the map. You should mark the location of the charging station on the map as precisely as possible (the mark on the map should be within up to 1 meter distance from the charging station). You can attach a charging station to the specific robot in its settings.'
  }
  isStationsToolbarOpened: boolean;
  isChargeStationsToolbarOpened: boolean;
  public mapModes = InfrastructureMapMode;
  public stations: ToolbarStation[] = [];
  public filteredStations: ToolbarStation[] = [];

  constructor(
    private infrastructureMapService: InfrastructureMapService,
    private stationsRestService: StationsRestService,
    private stationsService: StationsService,
    private applicationsService: ApplicationsService
  ) {}

  ngOnInit(): void {
    this.mapModeSubscription = this.infrastructureMapService.modeSetted.subscribe((mode) => {
      this.activeMode = mode;

      if (!this.activeMode) {
        this.show = true;
      }
    });

    this.infrastructureMapService.isStartDrawing().subscribe(res => this.show = !res);
  }

  openStationsToolbar(event: Event): void {
    this.setMapMode(null, event);
    event.preventDefault();
    event.stopPropagation();
    this.loading = true;
    this.getStations();
    this.stationsSearchControl = new FormControl(null);
    this.stationsSearchControlSubscription$ = this.stationsSearchControl.valueChanges.subscribe(value => {
      this.filteredStations = this.stations.filter((station) => {
        if (!value) {
          return true;
        }
        return station?.name?.toLowerCase().includes(value.toLowerCase());
      });
    });

    this.isStationsToolbarOpened = true;
  }

  openChargeStationsToolbar(event: Event) {
    this.setMapMode(null, event);
    this.isChargeStationsToolbarOpened = true;
  }

  getStations(): void {
    this.stationsRestService.list(this.infrastructureId, null, 'WORK').pipe(
      take(1),
      map(stations => {
        return stations.filter(({ floor, system }) => system && !floor);
      })
    ).subscribe(filtered => {
      this.filteredStations = this.stations = filtered;
      this.getDashboardApplications();
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  getDashboardApplications(): void {
    const appRequests = [];
    this.stations.map((station, index) => {
      let appRequest = this.applicationsService.getApplications(station._id, ReferenceType.STATION, ApplicationType.DASHBOARD);
      appRequests.push(appRequest);
    });

    forkJoin(appRequests).subscribe((res: any) => {
      this.sortApplications(res);
    }, err => {
      console.error('Error while getting Applications', err.message);
    });
  }

  selectStation(station: Station, event: Event): void {
    this.stopEvent(event);
    this.stationsService.setStationToAdd(station);
    this.infrastructureMapService.setMode(InfrastructureMapMode.WORK_STATION);
    this.closeStationsToolbar();
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  closeStationsToolbar(): void {
    try {
      this.stationsSearchControlSubscription$.unsubscribe();
    } catch (e) {
    }
    this.filteredStations = this.stations = [];
    this.isStationsToolbarOpened = false;
  }

  closeChargeStationsToolbar() {
    this.isChargeStationsToolbarOpened = false;
  }

  setMapMode(mode: InfrastructureMapMode, event: Event): void {
    if (this.activeMode) {
      this.infrastructureMapService.setMode(null);
    }

    event.stopPropagation();
    event.preventDefault();
    if (this.isStationsToolbarOpened) {
      this.isStationsToolbarOpened = false;
    }
    this.infrastructureMapService.setMode(mode);
  }

  ngOnDestroy(): void {
    try {
      this.mapModeSubscription.unsubscribe();
      this.subscriptions$.unsubscribe();
      if (this.stationsSearchControlSubscription$) {
        this.stationsSearchControlSubscription$.unsubscribe();
      }
    } catch (e) {
    }
  }

  private sortApplications(applications: any) {
    this.stations.map((station, index) => {
      if (applications[index].applications?.length) {
        return station['application'] = applications[index].applications[0];
      }
    });

    this.filteredStations = this.stations;
  }
}
