import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private markersCoordsReceived$ = new Subject<boolean>();
  private markerSelected$ = new Subject<any>();

  constructor() { }

  // Marker coordinates received for Map
  get viewMarkersCoordsReceived() {
    return this.markersCoordsReceived$.asObservable();
  }
  markersCoordsReceived(status: boolean) {
    this.markersCoordsReceived$.next(status);
  }

  // Marker Selected
  get viewMarkerSelected() {
    return this.markerSelected$.asObservable();
  }
  markerSelected(infrastructure: any) {
    this.markerSelected$.next(infrastructure);
  }
}
