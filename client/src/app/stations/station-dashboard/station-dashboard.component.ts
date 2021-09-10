import { ApplicationBuildService, ApplicationType, ApplicationsService } from '@aitheon/core-client';
import { ProjectsRestService } from '@aitheon/creators-studio';
import { Infrastructure, InfrastructureRestService, Station, StationsRestService } from '@aitheon/smart-infrastructure';
import { GraphsRestService } from '@aitheon/system-graph';
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable, of, OperatorFunction, Subscription } from 'rxjs';
import { catchError, map, switchMap, take, tap, delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { InfrastructureService } from '../../infrastructures/infrastructure.service';
import { StationType } from '../../shared/enums';
import { ModalService } from '@aitheon/core-client';
import { OrganizationsService } from '../../shared/services/organizations.service';
import { StationCardComponent } from '../station-card/station-card.component';

@Component({
  selector: 'ai-station-dashboard',
  templateUrl: './station-dashboard.component.html',
  styleUrls: ['./station-dashboard.component.scss']
})
export class StationDashboardComponent implements OnInit {
  @ViewChildren('stations') stationsView: QueryList<StationCardComponent>;

  subscriptions$ = new Subscription();
  activeTab = 1;
  infrastructure: Infrastructure;
  searchFocused: boolean;
  currentOrganization: any;
  search: any;
  systemList: any = [];
  searchFocus = false;
  newStationMode = false;
  infrastructureId: string;
  chargeColor: any;
  statusColor: any;
  statusTaskColor: any;
  stations: any[];
  filteredStations: any[];
  openedStation = '';
  graphNodeId = '';
  activeStation: any;
  config = {
    displayKey: 'key',
    search: false
  };
  isLoading: boolean;
  ptpStatus = 'DISABLED'; // Permission to pay

  constructor(
    private infrastructuresRestService: InfrastructureRestService,
    private infrastructureService: InfrastructureService,
    private toaster: ToastrService,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private stationsRestService: StationsRestService,
    private projectsRestService: ProjectsRestService,
    private graphsRestService: GraphsRestService,
    private modalService: ModalService,
    private organizationsService: OrganizationsService,
    private applicationsService: ApplicationsService,
    private applicationBuildService: ApplicationBuildService,
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.loadData();
  }

  loadData() {
    this.subscriptions$.add(this.getCurrentOrganization().pipe(
      switchMap(() => this.infrastructureService.infrastructureId.asObservable()),
      switchMap((infrastructureId: string) => {
        this.infrastructureId = infrastructureId;
        return forkJoin([
          this.loadInfrastructure(),
          this.loadStations(),
        ]);
      }),
    ).subscribe(() => {
      this.isLoading = false;
    }));
  }


  getCurrentOrganization() {
    return this.organizationsService.currentOrganization$.pipe(
      take(1),
      tap(organization => {
        this.currentOrganization = organization;
        if (!environment.production) {
          this.organizationsService.setHeaders(this.projectsRestService);
          this.organizationsService.setHeaders(this.graphsRestService);
        }
      }));
  }

  loadInfrastructure(): Observable<Infrastructure> {
    return this.infrastructuresRestService.getById(this.infrastructureId).pipe(tap(infrastructure => {
        this.infrastructure = infrastructure;
      }),
      this.handleError('Unable to load infrastructure'));
  }

  loadStations(): Observable<any> {
    this.isLoading = true;
    return this.stationsRestService.list(this.infrastructureId).pipe(
      take(1),
      map((stations: Station[]) => stations.filter(station => station?.type === StationType.WORK)),
      tap((workStations: Station[]) => {
        this.filteredStations = this.stations = workStations;
        this.isLoading = false;
        this.applicationBuildService.setBuildStatus$(null);
      }),
      this.handleError('Unable to load stations', () => {
        this.applicationBuildService.setBuildStatus$(null);
        this.isLoading = false;
      }));
  }

  onSearch(search: any) {
    this.filteredStations = this.stations.filter(station => station.name.toLowerCase().includes(search.toLowerCase()));
  }

  addStation() {
    this.newStationMode = true;
    // TODO:
    //  if no empty seats and user has no permission to pay:
    //  - this.ptpStatus = 'ENABLED' -> call modal
    //  - Don`t change this.newStationMode
  }

  closeNewSectionForm() {
    this.newStationMode = false;
  }

  goToStationPage() {
    this.router.navigate(['station'], { relativeTo: this.activeRoute });
  }

  public openStationMenu(event, station): void {
    this.stopEvent(event);
    this.openedStation = station.name;
  }

  public onCreateNode(event: { name: string, service: string, type: string, subType: string, meta: { stationId: string } }): void {
    this.applicationsService.service$.pipe(take(1), switchMap(service => {
      this.applicationBuildService.createApplication({
        ...event as any,
        subType: ApplicationType.DASHBOARD,
        meta: {
          stationId: this.activeStation._id,
          service,
        },
      });
      return this.onBuildFinished() as Observable<void>;
    })).subscribe();
  }

  public editApplication(projectId: string): void {
    this.applicationBuildService.editApplication(projectId);
    this.onBuildFinished(true);
  }

  onBuildFinished(subscribe?: boolean): Observable<void> | void {
    const observable$ = this.applicationBuildService.buildFinished$.pipe(
      take(1),
      switchMap(this.loadStations.bind(this)),
    );

    if (subscribe) {
      observable$.subscribe();
      return;
    }

    return observable$;
  }

  private showDeployOverlay(): void {
    this.applicationBuildService.setBuildStatus$({
      current: 'Deploying...',
      steps: ['Deploying...'],
      approximateTime: '40 seconds',
    });
    const timeout = setTimeout(() => {
      this.loadStations();
      this.applicationBuildService.setBuildStatus$(null);
      clearTimeout(timeout);
    }, 22000);
  }

  public deployExistingApplication(graphNodes: any[]): void {
    if (graphNodes) {
      const [dashboardNode] = graphNodes;
      if (dashboardNode) {
        this.subscriptions$.add(this.graphsRestService.deployNode({ graphNodeId: dashboardNode?._id, publish: true })
          .pipe(this.handleError('Unable to deploy application'),
            delay(300),
            switchMap(this.loadStations.bind(this))).subscribe());
      }
    }
  }

  private stopEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  public showError(errorMessage: string): void {
    this.toaster.error(errorMessage);
  }

  public createApp(station: any) {
    this.activeStation = station;
    this.modalService.openModal('AUTOMATE_MODAL', {
      type: 'DASHBOARD',
      reference: this.activeStation._id,
    });
  }

  public deleteApplication(graphNodeData: any): void {
    this.showDeleteConfirm(graphNodeData);
  }

  private showDeleteConfirm(graphNodeData: any): void {
    this.modalService.openGenericConfirm({
      text: `Are you sure you want to delete the «${graphNodeData.name}» dashboard Application?`,
      headlineText: `Delete dashboard Application`,
      confirmText: `Delete`,
      creationConfirm: true,
      callback: (confirm) => {
        if (confirm) {
          this.onDeleteDashboardApplication(graphNodeData.id);
        }
      }
    });
  }

  onDeleteDashboardApplication(graphNodeId: string): void {
    this.isLoading = true;
    this.subscriptions$.add(this.graphsRestService.removeApplication({
      graphNodeId,
    }).subscribe(() => {
        if (this.stationsView) {
          this.stationsView.find(station => station.getApplication()?.graphNodeId === graphNodeId)?.setApplication(null);
        }
        this.isLoading = false;
        this.toaster.success('Dashboard application successfully removed!');
      },
      (error) => {
        this.isLoading = false;
        this.toaster.error(error?.message || 'Unable to remove dashboard application');
      }));
  }

  private handleError(message: string, executor?: (error: Error) => void): OperatorFunction<any, any> {
    return catchError((error) => {
      this.toaster.error(message);
      executor?.(error);
      return of(undefined);
    });
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {
    }
  }
}
