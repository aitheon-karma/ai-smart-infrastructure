import { Component, OnInit, Input, SimpleChanges, OnChanges, Output, EventEmitter } from '@angular/core';
import { AuthService } from '@aitheon/core-client';
import { InfrastructureRestService, Infrastructure } from '@aitheon/smart-infrastructure';
import { ToastrService } from 'ngx-toastr';
import {InfrastructureService} from "../infrastructure.service";
import { LoadingService } from "../../shared/services/loading.service";


@Component({
  selector: "ai-infrastructures-list",
  templateUrl: "./infrastructures-list.component.html",
  styleUrls: ["./infrastructures-list.component.scss"]
})
export class InfrastructuresListComponent implements OnInit, OnChanges {

  @Input() searchText: string;
  @Input() infrastructuresType: string = 'ACTIVE';
  @Output() emptyList: EventEmitter<boolean> = new EventEmitter<boolean>(false);

  currentOrganization: any;
  infrastructures: Infrastructure[];
  buildings: Infrastructure[] = [];
  warehouses: Infrastructure[] = [];
  factories: Infrastructure[] = [];
  loading: boolean = false;
  hasArchivedInfrastructures: boolean = false;
  infraItems: any;

  constructor(
    private infrastructureRestService: InfrastructureRestService,
    private infrastructureService: InfrastructureService,
    private authService: AuthService,
    private toastr: ToastrService,
    public loadingService: LoadingService
  ) {}

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.searchText) {
      this.getInfrastructure();
    }
  }

  getInfrastructure() {
    this.loading = true;
    this.loadingService.loadingOn();
    this.buildings = [];
    this.factories = [];
    this.warehouses = [];
    this.infrastructureRestService.list(this.searchText, true)
      .subscribe((infrastructures: Infrastructure[]) => {
          this.parseInfrastructures(infrastructures);
          this.loading = false;
          this.loadingService.loadingOff();
        },
        err => {
          this.loading = false;
          this.loadingService.loadingOff();
          this.toastr.error(err.error.message ? err.error.message : err.message);
        }
      );
  }

  parseInfrastructures(infrastructures: Infrastructure[]) {
    this.infrastructures = infrastructures;

    this.checkIfHasArchivedInfrastructures(infrastructures);

    if (!this.infrastructures.length && !this.searchText) {
      this.emptyList.emit(true);
    }

    this.infrastructures.forEach(i => {
      if (i.type === 'BUILDING') {
        this.buildings.push(i);
      } else if (i.type === 'FACTORY') {
        this.factories.push(i);
      } else if (i.type === 'WAREHOUSE') {
        this.warehouses.push(i);
      }
    });

    this.infraItems = [
      {
        name: 'Buildings',
        infrastructures: this.buildings,
        isOpen: sessionStorage.getItem('BuildingsListOpen') ?
          JSON.parse(sessionStorage.getItem('BuildingsListOpen')) :
          true,
        itemType: 'BUILDING'
      },
      {
        name: 'Warehouses',
        infrastructures: this.warehouses,
        isOpen: sessionStorage.getItem('WarehousesListOpen') ?
          JSON.parse(sessionStorage.getItem('WarehousesListOpen')) :
          true,
        itemType: 'WAREHOUSE'
      },
      {
        name: 'Factories',
        infrastructures: this.factories,
        isOpen: sessionStorage.getItem('FactoriesListOpen') ?
          JSON.parse(sessionStorage.getItem('FactoriesListOpen')) :
          true,
        itemType: 'FACTORY'
      }

    ];
  }

  onAfterDelete(event) {
    if (event) {
      this.getInfrastructure();
    }
  }

  toggleSubNav(type: string) {
    this.infraItems.map(infra => {
      if (infra.itemType === type) {
        infra.isOpen = !infra.isOpen;
        sessionStorage.setItem(infra.name + 'ListOpen', infra.isOpen);
      }
    });

  }

  navigateToSelectedItem(infrastructure: any) {
    let target = this.infraItems.filter(infra => infra.itemType === infrastructure.data.type);
    target = {...target[0]};

    if (target.isOpen === false) {
      this.toggleSubNav(target.itemType);
    }

    setTimeout(() => {
      infrastructure.el.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }, 99);
  }

  public getNumberOfCurrentTypeInfrastructures(item: any, type: string): number {
    let numberOfCurrentTypeInfrastructures = 0;

    if (item && item.infrastructures) {
      numberOfCurrentTypeInfrastructures = item.infrastructures.filter(infrastructure => infrastructure.status === type).length;
    }

    return numberOfCurrentTypeInfrastructures;
  }

  private checkIfHasArchivedInfrastructures(infrastructures: Infrastructure[]): void {
    this.hasArchivedInfrastructures = infrastructures.some(infrastructure => infrastructure.status === 'ARCHIVED');
    this.infrastructureService.enableArchivedInfrastructures(this.hasArchivedInfrastructures);
  }
}
