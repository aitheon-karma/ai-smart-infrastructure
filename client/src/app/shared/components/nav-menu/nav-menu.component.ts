import { Component, Input, OnInit, } from '@angular/core';
import { InfrastructureService } from '../../../infrastructures/infrastructure.service';
import { NavMenuItem } from '../../models/nav-menu-item.model';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'ai-nav-menu',
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.scss']
})
export class NavMenuComponent implements OnInit {
  @Input() isInfrastructureMode: boolean = false;
  @Input() hasArchivedInfrastructures?: boolean = false;
  @Input() archivedInfrastructure?: boolean = false;

  public menuData: NavMenuItem[] = [
    new NavMenuItem(
      'Dashboard',
      ['dashboard'],
    ),
    new NavMenuItem(
      'Structure',
      ['structure'],
    ),
    new NavMenuItem(
      'Tasks',
      ['tasks']
    ),
    new NavMenuItem(
      'Items',
      ['items']
    ),
    new NavMenuItem(
      'Device manager',
      ['device-manager'],
    ),
    new NavMenuItem(
      'Stations',
      ['stations'],
    ),
    new NavMenuItem(
      'Settings',
      ['settings'],
    ),
  ];
  public infrastructureType$: Observable<'ACTIVE' | 'ARCHIVED' | null>;

  constructor(
    public router: Router,
    private infrastructureService: InfrastructureService,
    private route: ActivatedRoute,
    public loadingService: LoadingService,
  ) {
  }

  ngOnInit(): void {
    this.infrastructureType$ = this.infrastructureService.infrastructureType$;

    if (this.router.url?.includes('activity')) {
      this.infrastructureService.setInfrastructureType(null);
      this.checkArchivedInfrastructures();
    }
  }

  changeTab(event: Event, routerLink: string[]): void {
    event.stopPropagation();
    event.preventDefault();

    const isOnApplications = this.router.url.includes('/applications');

    if (routerLink[0] === '/') {
      this.router.navigate(routerLink);
      return;
    }

    if (isOnApplications) {
      const infrastructureId = JSON.parse(localStorage.getItem('infrastructure')).Id;
      const linkToNavigate = [`/infrastructure/${infrastructureId}/${routerLink[0]}`];

      this.router.navigate(linkToNavigate);
    } else {
      this.router.navigate(routerLink, {
        relativeTo: this.route,
      });
    }
  }

  goToInfraAutomation() {
    this.router.navigate(['automation'], { relativeTo: this.route });
  }

  public switchInfrastructuresType(type: 'ACTIVE' | 'ARCHIVED'): void {
    this.infrastructureService.setInfrastructureType(type);
    if (this.router.url.includes('activity') || this.router.url.includes('applications/dashboard')) {
      this.router.navigate(['/dashboard']);
    }
  }

  checkArchivedInfrastructures() {
    this.infrastructureService.hasArchivedInfrastructures.subscribe((hasArchived: boolean) => {
      this.hasArchivedInfrastructures = hasArchived;
    });
  }
}
