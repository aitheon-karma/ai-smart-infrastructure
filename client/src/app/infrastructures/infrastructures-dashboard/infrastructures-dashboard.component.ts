import {
  ApplicationBuildService,
  ModalService,
  ApplicationsService as CoreApplicationsService,
} from '@aitheon/core-client';
import { Infrastructure, InfrastructureRestService } from '@aitheon/smart-infrastructure';
import { GraphsRestService } from '@aitheon/system-graph';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, OperatorFunction, Subject, Subscription } from 'rxjs';

import { catchError, switchMap, take, tap, delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApplicationsService,
  ApplicationType,
  ReferenceType
} from '../../shared/services/applications.service';
import { OrganizationsService } from '../../shared/services/organizations.service';
import { InfrastructureService } from '../infrastructure.service';
import { LoadingService } from '../../shared/services/loading.service';

@Component({
  selector: 'ai-infrastructures-dashboard',
  templateUrl: './infrastructures-dashboard.component.html',
  styleUrls: ['./infrastructures-dashboard.component.scss']
})
export class InfrastructuresDashboardComponent implements OnInit, OnDestroy {
  private subscriptions$ = new Subscription();

  infrastructureId: string;
  infrastructure: Infrastructure;
  addFloorForm = false;
  addFloorFormOpen = false;
  isAppConfigured = true;
  application: any;
  graphUrl: string;
  deploySubject: Subject<void>;
  loading: boolean;

  constructor(
    private router: Router,
    private infrastructureRestService: InfrastructureRestService,
    private infrastructureService: InfrastructureService,
    private modalService: ModalService,
    private applicationBuildService: ApplicationBuildService,
    private graphsRestService: GraphsRestService,
    private applicationsService: ApplicationsService,
    private organizationsService: OrganizationsService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private coreApplicationsService: CoreApplicationsService,
  ) {
  }

  ngOnInit() {
    this.loading = true;
    this.subscriptions$.add(this.infrastructureService.infrastructureId.pipe(
      switchMap((id) => {
        this.infrastructureId = id;
        return this.getInfrastructureData();
      })).subscribe());
  }

  getInfrastructureData(): Observable<any> {
    return this.infrastructureRestService.getById(this.infrastructureId).pipe(
      switchMap((infrastructure: Infrastructure) => {
        this.infrastructure = infrastructure;

        if (this.infrastructure.status === 'ARCHIVED') {
          this.infrastructureService.setInfrastructureType(this.infrastructure.status);
        }

        return this.getOrganization();
      }));
  }

  getOrganization(): Observable<any> {
    return this.organizationsService.currentOrganization$.pipe(
      take(1),
      switchMap(() => {
        if (!environment.production) {
          this.organizationsService.setHeaders(this.graphsRestService);
        }
        return this.getDashboardApp();
      }));
  }

  getDashboardApp(): Observable<any> {
    this.loading = true;
    return this.applicationsService.getApplications(this.infrastructureId, ReferenceType.INFRASTRUCTURE, ApplicationType.DASHBOARD)
      .pipe(tap(graphData => {
          const [dashboardApplication] = graphData?.applications;
          if (graphData?.applications?.length) {
            this.application = dashboardApplication;
          }
          if (graphData?.graphId) {
            this.graphUrl = `/system-graph/graphs/organization/service/SMART_INFRASTRUCTURE/sub-graph/${graphData?.graphId}`;
          }
          this.loading = false;
          if (this.deploySubject) {
            this.deploySubject = null;
          }
        }),
        this.handleError('Unable to load application', () => {
          this.loading = false;
        }));
  }

  private handleError(message: string, executor?: () => void): OperatorFunction<any, any> {
    return catchError(() => {
      this.toastr.error(message);
      executor?.();
      return of(undefined);
    });
  }

  openCore() {
    if (this.graphUrl) {
      window.open(this.graphUrl, '_blank');
    }
  }

  goAddFloorForm() {
    this.addFloorForm = !this.addFloorForm;
  }

  isAddFloorFormOpen(value: boolean) {
    this.addFloorFormOpen = value;

    if (!value) {
      this.getInfrastructureData();
    }
  }

  closeAddFloorModalForm(updatedInfrastructureData: {infrastructure: Infrastructure, floorNumber: number}) {
    this.addFloorFormOpen = false;
    this.addFloorForm = false;
    this.infrastructure = updatedInfrastructureData.infrastructure;
    this.router.navigate(
      ['infrastructure', this.infrastructure._id, 'dashboard'],
      { queryParams: { floor: updatedInfrastructureData.floorNumber } }
      );
  }

  public onCreateNode(event: { name: string, service: string, type: string, subType: string, meta: { infrastructureId: string } }): void {
    this.subscriptions$.add(this.coreApplicationsService.service$.pipe(tap(service => {
        this.applicationBuildService.createApplication({
          ...event as any,
          subType: ApplicationType.DASHBOARD,
          meta: {
            infrastructureId: this.infrastructureId,
            service,
          },
        });
      }),
      switchMap(() => this.onBuildFinish() as Observable<void>),
    ).subscribe());
  }

  onEditDashboardApp(): void {
    this.applicationBuildService.editApplication(this.application.project?._id);
    this.onBuildFinish(true);
  }

  onBuildFinish(subscribe?: boolean): Observable<void> | void {
    const observable$ = this.applicationBuildService.buildFinished$.pipe(
      take(1),
      switchMap(() => this.getDashboardApp()));

    if (subscribe) {
      observable$.subscribe();
      return;
    }

    return observable$;
  }

  deployDashboardApp(graphNodes: any[]): void {
    this.loading = true;
    const [dashboardNode] = graphNodes;
    if (dashboardNode) {
      this.graphsRestService.deployNode({ graphNodeId: dashboardNode?._id, publish: true })
        .pipe(
          delay(300),
          this.handleError('Unable to deploy application', () => {
            this.loading = false;
          }),
          switchMap(() => {
            return this.getDashboardApp();
          })).subscribe();
    }
  }

  onDeleteDashboardApplication({ graphNodeId }): void {
    this.application = null;
    this.loading = false;
    this.toastr.success('Dashboard application successfully removed!');
  }

  createApp() {
    this.modalService.openModal('AUTOMATE_MODAL', { type: 'DASHBOARD', reference: this.infrastructure._id });
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {
    }
  }
}
