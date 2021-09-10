import { Station } from '@aitheon/smart-infrastructure';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import {
  ApplicationsService,
  ApplicationType,
  ReferenceType,
  NodeStatus
} from '../../shared/services/applications.service';
import { getFormattedFloorNumber } from '../../shared/utils/formatted-names';

@Component({
  selector: 'ai-station-card',
  templateUrl: './station-card.component.html',
  styleUrls: ['./station-card.component.scss']
})
export class StationCardComponent implements OnInit {
  @Input() station: any;
  @Input() archivedInfrastructure: boolean;
  @Output() createApp = new EventEmitter<Station>();
  @Output() editApplication = new EventEmitter<string>();
  @Output() deleteApplication = new EventEmitter<{ id: string, name: string }>();

  isShowMoreMenuOpened: boolean;
  subscriptions$ = new Subscription();
  graphURL: string;
  floor: any;
  application: any;
  status: string;
  public isLoading: boolean;
  nodeStatus = NodeStatus;

  private static stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private applicationsService: ApplicationsService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    if (this.station) {
      this.getDashboardApplication();
    }
  }

  getDashboardApplication(): void {
    this.isLoading = true;
    this.subscriptions$.add(this.applicationsService.getApplications(this.station._id, ReferenceType.STATION, ApplicationType.DASHBOARD)
      .subscribe(graphData => {
          this.graphURL = `/system-graph/graphs/organization/service/SMART_INFRASTRUCTURE/sub-graph/${graphData.graphId}`;

          this.status = graphData.status;
          if (graphData?.applications?.length) {
            const [application] = graphData?.applications;
            this.application = application;
          }
          this.isLoading = false;
        },
        error => {
          this.toastr.error(error?.message || 'Unable to load station dashboard application');
          this.isLoading = false;
        }));
    this.floor = this.station?.floor ? this.station.infrastructure?.floors.filter(floor => this.station?.floor === floor._id)[0] : '-';
  }

  public openShowMoreMenu(event: Event): void {
    this.isShowMoreMenuOpened = !this.isShowMoreMenuOpened;
    StationCardComponent.stopEvent(event);
  }

  public closeMoreMenu(): void {
    this.isShowMoreMenuOpened = false;
  }

  public onCreateApp(event?: Event): void {
    if (event) {
      StationCardComponent.stopEvent(event);
    }
    this.createApp.emit(this.station);
  }

  onEditApp(event: any): void {
    let browserEvent = !event.graphNodeId ? event : window.event;

    StationCardComponent.stopEvent(browserEvent);

    this.editApplication.emit(this.application?.project?._id);
  }

  onDeleteApp(event: Event): void {
    StationCardComponent.stopEvent(event);
    this.deleteApplication.emit({ id: this.application?.graphNodeId, name: this.application?.project?.name });
  }

  goToStation(event: Event): void {
    StationCardComponent.stopEvent(event);
    if (this.station?._id) {
      this.router.navigate([`${this.station._id}`], { relativeTo: this.route });
    }
  }

  public getApplication(): any {
    return this.application;
  }

  public setApplication(application: any): any {
    this.application = application;
  }

  public getFloorNumber(floorNumber: number): string {
    return getFormattedFloorNumber(floorNumber);
  }
}
