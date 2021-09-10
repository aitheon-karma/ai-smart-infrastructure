import { Graph, GraphsRestService } from '@aitheon/system-graph';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Subscription, Observable, of } from 'rxjs';
import { switchMap, map, take, catchError } from 'rxjs/operators';
import { InfrastructureService } from '../../infrastructures/infrastructure.service';
import { Application, ApplicationsService } from '../../shared/services/applications.service';
import { OrganizationsService } from '../../shared/services/organizations.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'ai-si-application-dashboard',
  templateUrl: './application-dashboard.component.html',
  styleUrls: ['./application-dashboard.component.scss']
})
export class SiApplicationDashboardComponent implements OnInit, OnDestroy {
  private subscriptions$ = new Subscription();
  private graphId: string;
  private graphNodeId: string;

  public graphURL: string;
  public application: Application;
  public isLoading: boolean;

  constructor(
    private route: ActivatedRoute,
    private applicationsService: ApplicationsService,
    private organizationsService: OrganizationsService,
    private graphsRestService: GraphsRestService,
    private infrastructureService: InfrastructureService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.infrastructureService.setInfrastructureType(null);
    this.organizationsService.currentOrganization$.pipe(
      take(1),
      switchMap(this.handleOrganization.bind(this)),
      switchMap(this.handleRouteParams.bind(this)),
      map(this.getApplicationFromGraph.bind(this)),
      catchError(this.handleError.bind(this))).subscribe((application) => {
      this.application = application;
      this.isLoading = false;
    });
  }

  private handleOrganization(): Observable<Params> {
    this.organizationsService.setHeaders(this.graphsRestService);
    return this.route.params;
  }

  private handleRouteParams({ graphId, graphNodeId }: Params): Observable<Graph> {
    this.graphId = graphId;
    this.graphNodeId = graphNodeId;
    return this.graphsRestService.getById(this.graphId);
  }

  private getApplicationFromGraph(graph: Graph): Application {
    this.getGraphURL(graph);
    const graphData = this.applicationsService.getGraphData(graph);
    return graphData?.applications?.find(({ graphNodeId }) => graphNodeId === this.graphNodeId);
  }

  private handleError(error: Error): Observable<undefined> {
    this.toastr.error(error.message || 'Unable to load application data');
    return of(undefined);
  }

  private getGraphURL(graph: Graph): void {
    this.graphURL = `/system-graph/graphs/organization/service/SMART_INFRASTRUCTURE${graph.type !== Graph.TypeEnum.SERVICE ? `/sub-graph/${graph._id}` : ''}`;
  }

  public openCore(): void {
    window.open(this.graphURL, '_blank');
  }

  ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
  }
}
