import { FormGroup, AbstractControl, FormBuilder } from '@angular/forms';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription, forkJoin } from 'rxjs';
import { InfrastructureRestService, Infrastructure } from '@aitheon/smart-infrastructure';
import { HttpClient } from '@angular/common/http';
import { DashboardService } from './dashboard.service';
import { environment } from 'src/environments/environment';
import { InfrastructureService } from '../infrastructures/infrastructure.service';

@Component({
  selector: 'ai-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  subscriptions: Subscription[] = [];
  searchForm: FormGroup;
  currentUser: any;
  searchText: string;
  infrastructures: Infrastructure[];
  infrastructureMarkers = [];
  googleMapMarkers = [];
  emptyList: boolean = false;
  hasArchivedInfrastructures: boolean = false;
  infrastructuresType: string = 'ACTIVE';
  ptpStatus = 'DISABLED'; // Permission to pay

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private infrastructureService: InfrastructureService,
    private infrastructureRestService: InfrastructureRestService,
    private http: HttpClient,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.listenToInfrastructureTypeChange();
    this.startWatchingArchivedInfrasreuctures();
    this.infrastructureService.setInfrastructureId(undefined);
    this.getOrgInfrastructures();
    this.buildSearchForm();

    // TODO: make sure this code is redundant and remove it at all
    // if (localStorage.getItem('infrastructure')) {
    //   if ((localStorage.getItem('smart-infratsructure'))) {
    //     return;
    //   } else {
    //     let infrastructure = JSON.parse(localStorage.getItem('infrastructure'));
    //     localStorage.setItem('smart-infratsructure', JSON.stringify(true));
    //     this.router.navigate(['/infrastructure/' + infrastructure.Id + '/dashboard']);
    //   }
    // }
  }

  listenToInfrastructureTypeChange(): void {
    this.subscriptions.push(this.infrastructureService.infrastructureType$.subscribe(type => {
      this.onInfrastructureTypeChange(type);
    }));
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  getOrgInfrastructures() {
    this.infrastructureRestService.list().subscribe((infrastructures: Infrastructure[]) => {
      this.infrastructures = infrastructures;
      if (!localStorage.getItem('googleMapMarkers') && infrastructures?.length) {
        this.getAddresses();
      } else {
        this.dashboardService.markersCoordsReceived(true);
      }
    });
  }

  getAddresses() {
    this.infrastructures.map(infrastructure => {
      if (infrastructure?.location) {
        this.infrastructureMarkers.push({
          _id: infrastructure._id,
          type: infrastructure?.type,
          name: infrastructure?.name,
          address: {
            street: infrastructure.location?.address?.addressLine1,
            city: infrastructure.location?.address?.city,
            code: infrastructure.location?.address?.code,
            country: infrastructure.location?.address?.country
          }
        });
      }
    });
    this.getCoords();
  }

  getCoords() {
    const mapRequests = [];
    this.infrastructureMarkers.map((marker, index) => {
      let address = Object.values(marker.address).join(' ');
      let markerReq = this.http.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${environment.googleMapKey}`);
      mapRequests.push(markerReq);
    });
    forkJoin(mapRequests).subscribe((res: any) => {
      this.infrastructureMarkers.map((marker, index) => {
        if (res[index].status === 'OK') {
          marker.location = res[index].results[0];
        }
      },
        err => {
          console.log('Error while getting Coordinates', err.message);
        });
      this.getMarkers(this.infrastructureMarkers);
      localStorage.setItem('googleMapMarkers', JSON.stringify(this.googleMapMarkers));
      this.dashboardService.markersCoordsReceived(true);
    });
  }

  getMarkers(data: any) {
    const image = {
      url: 'assets/icons/circle.svg',
      size: new google.maps.Size(12, 12),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(0, 0)
    };

    data.map(marker => {
      if (marker.location) {
        this.googleMapMarkers.push({
          position: {
            lat: marker.location.geometry.location.lat,
            lng: marker.location.geometry.location.lng
          },
          label: {
            color: 'white',
            text: marker.location.formatted_address
          },
          data: {
            _id: marker._id,
            type: marker?.type,
            name: marker?.name,
            address: marker.location.formatted_address
          },
          options: {
            animation: google.maps.Animation.DROP,
            icon: image
          }
        });
      }
    });
  }

  buildSearchForm(): void {
    this.searchForm = this.fb.group({
      searchText: [null],
    });

    this.listenToSearchControlValueChanges();
  }

  listenToSearchControlValueChanges(): void {
    this.subscriptions.push(this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe(value => {
      this.searchText = value;
      this.cdr.detectChanges();
    }));
  }

  clearValue(event: Event): void {
    this.stopEvent(event);
    this.searchControl.reset();
  }

  createInfrastructure() {}

  stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  get searchControl(): AbstractControl {
    return this.searchForm.get('searchText');
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) {
      try {
        subscription.unsubscribe();
      } catch (e) {}
    }
  }

  public onInfrastructureTypeChange(type: string): void {
    this.infrastructuresType = type;
  }

  private startWatchingArchivedInfrasreuctures(): void {
    this.subscriptions.push(
      this.infrastructureService.hasArchivedInfrastructures
        .subscribe((hasArchived: boolean) => {
          this.hasArchivedInfrastructures = hasArchived;
        })
    );
  }

  applyEmptyListSettings(status: boolean) {
    // this.hasArchivedInfrastructures = status;
    return this.emptyList = true;
  }

  addInfrastructure() {
    this.router.navigate(['/infrastructure/new'], { relativeTo: this.route }).then();
    // TODO:
    //  if no empty seats and user has no permission to pay:
    //  - this.ptpStatus = 'ENABLED' -> call modal
    //  - disable navigation to create new Infra
  }
}
