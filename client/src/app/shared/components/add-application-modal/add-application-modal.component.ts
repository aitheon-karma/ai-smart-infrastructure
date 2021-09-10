import { Subscription, forkJoin } from 'rxjs';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Component, OnInit, ViewChild, TemplateRef, OnDestroy, Output, EventEmitter } from '@angular/core';
import { ProjectsRestService, Project } from '@aitheon/creators-studio';
import { AuthService, ModalService } from '@aitheon/core-client';
import { environment } from '../../../../environments/environment';
import { StationsRestService } from '@aitheon/smart-infrastructure';
import { GraphsRestService } from '@aitheon/system-graph';
import { DriverToController } from '@aitheon/system-graph/lib/rest/model/driver-to-controller';

interface Application {
  name: string,
  type: string,
  lastEdited: Date | string,
  id: string
}

@Component({
  selector: 'ai-add-application-modal',
  templateUrl: './add-application-modal.component.html',
  styleUrls: ['./add-application-modal.component.scss']
})
export class AddApplicationModalComponent implements OnInit, OnDestroy {
  @ViewChild('addApplicationModal') addApplicationModal: TemplateRef<any>;
  @Output() closeModalEvent = new EventEmitter<boolean>();
  @Output() applicationsAdded = new EventEmitter<any[]>();
  @Output() driverAdded = new EventEmitter<{
    controllerId: string,
    driver: Project,
  }>();

  modalType = 'ADD_APPLICATION_MODAL';
  addApplicationModalRef: BsModalRef;
  loading: boolean = false;
  selectedApplications: Array<any> = [];
  mode: string;
  currentOrganization: any;
  activeProject: any;
  stationId: string;
  subscription: Subscription;
  applications: Array<any> = [];
  reference: string;
  data: any;

  constructor(
    private bsModalService: BsModalService,
    private modalService: ModalService,
    private projectsRestService: ProjectsRestService,
    private stationsRestService: StationsRestService,
    private authService: AuthService,
    private graphsRestService: GraphsRestService,
  ) {}

  ngOnInit(): void {
    this.selectedApplications = [];

    this.authService.activeOrganization.subscribe((org: any) => {
      this.currentOrganization = org;
      if (!environment.production) {
        this.graphsRestService.defaultHeaders = this.projectsRestService
          .defaultHeaders.set('organization-id', org._id);
      }
    });

    this.subscription = this.modalService.openModal$.subscribe(({ type, data }) => {
      if (type === this.modalType) {
        this.reference = data.reference;
        this.data = data;

        this.mode = data.type;
        this.stationId = data.station;
        this.fetchProjects(this.mode);
        this.show();
      }
    });
  }

  fetchProjects(mode: string) {
    this.authService.activeOrganization.subscribe((org: any) => {
      this.currentOrganization = org;
      if (!environment.production) {
        this.projectsRestService.defaultHeaders = this.projectsRestService
          .defaultHeaders.set('organization-id', org._id);
        this.stationsRestService.defaultHeaders = this.stationsRestService
          .defaultHeaders.set('organization-id', org._id);
      }

      if (mode === 'APPLICATION') {
        forkJoin([
          this.projectsRestService.list('APP', 'APPLICATION', true),
          this.projectsRestService.list('ROBOT', 'APPLICATION', true)
        ]).subscribe(([uiApps, robotApps]: any) => {
          this.applications = this.formatProjects([...uiApps, ...robotApps]);
        });
      } else if (mode === 'DEVICE_DRIVER') {
        this.projectsRestService.list('DEVICE_NODE', undefined, true).subscribe((projects: Project[]) => {
          this.applications = this.formatProjects(projects);
        });
      } else if (mode === 'AUTOMATION') {
        this.projectsRestService.list('APP', 'AUTOMATION', true).subscribe((projects: Project[]) => {
          this.applications = this.formatProjects(projects);
        });
      } else if (mode === 'DEVICE_NODE') {
        this.projectsRestService.list('COMPUTE_NODE', undefined, true).subscribe((projects: Project[]) => {
          projects = projects.filter((p: Project) => p.runtime === 'AOS');
          this.applications = this.formatProjects(projects);
        });
      } else {
        this.projectsRestService.list('APP', 'DASHBOARD', true).subscribe((projects: Project[]) => {
          this.applications = this.formatProjects(projects);
        });
      }
    });
  }

  private formatProjects(projects: Project[] = []): any[] {
    const updated = projects.map(project => ({
      ...project,
      updatedAt: new Date(project?.updatedAt),
    })).filter(p => !p.archived);

    if (this.data?.existing?.length) {
      return updated.filter(({ _id }) => !this.data.existing?.includes(_id));
    }

    return updated;
  }

  public show() {
    this.addApplicationModalRef = this.bsModalService.show(
      this.addApplicationModal,
      Object.assign({}, { class: 'add-application-modal' })
    );
  }

  public closeModal() {
    this.modalService.onModalClose(this.modalType);
    this.addApplicationModalRef.hide();
    this.closeModalEvent.emit(true);
    this.selectedApplications = [];
  }

  public updateSelectedApplications(item: Application): void {
    const isAlreadySelected = this.isItemSelected(item);

    if (isAlreadySelected) {
      const itemIndex = this.getSelectedItemIndex(item);

      this.selectedApplications.splice(itemIndex, 1);
    } else {
      this.selectedApplications.push(item);
    }
  }

  public isItemSelected(item: Application): boolean {
    const itemIndex = this.getSelectedItemIndex(item);

    return itemIndex !== -1;
  }

  public getSelectedItemIndex(item: Application): number {
    return this.selectedApplications.indexOf(item);
  }

  chooseSingleProject(item: any) {
    this.activeProject = item._id;
  }

  onAdd(): void {
    const selectedIds = this.selectedApplications.map((a: any) => a._id);
    switch (this.mode) {
      case 'DEVICE_DRIVER':
        const payload = {
          device: this.data.device,
          projectId: this.activeProject,
          reference: this.data.subGraphReference
        } as DriverToController;
        this.graphsRestService.addDriverToController(payload).subscribe((res: any) => {
          this.driverAdded.emit({
            controllerId: payload.device?._id,
            driver: this.applications.find(({ _id }) => _id === payload.projectId),
          });
          this.closeModal();
        });
        break;
      case 'DASHBOARD':
        this.graphsRestService.addAppsToSubGraph(this.reference, { projects: [this.activeProject] }).subscribe((res: any) => {
          this.applicationsAdded.emit(res);
          this.closeModal();
        });
        break;
      case 'APPLICATION':
      case 'AUTOMATION':
      case 'DEVICE_NODE':
        this.graphsRestService.addAppsToSubGraph(this.reference, {
          projects: selectedIds,
          deviceId: this.data.deviceId
        }).subscribe((res: any) => {
          this.applicationsAdded.emit(res);
          this.closeModal();
        });
        break;
    }
  }

  onChoose() {

  }

  ngOnDestroy() {
    try {
      this.subscription.unsubscribe();
    } catch (e) {
    }
  }
}
