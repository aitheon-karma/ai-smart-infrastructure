import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InfrastructureService {
  private _infrastructureType$: BehaviorSubject<'ACTIVE' | 'ARCHIVED'> = new BehaviorSubject<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  infrastructureId: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  hasArchivedInfrastructures: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  public get infrastructureType$(): Observable<'ACTIVE' | 'ARCHIVED'> {
    return this._infrastructureType$.asObservable();
  }

  public setInfrastructureType(type: 'ACTIVE' | 'ARCHIVED'): void {
    this._infrastructureType$.next(type);
  }

  public setInfrastructureId(id: string): void {
    this.infrastructureId.next(id);
  }

  public enableArchivedInfrastructures(hasArchived: boolean): void {
    this.hasArchivedInfrastructures.next(hasArchived);
  }


  humanize(str: string) {
    if (str === 'AOS_DEVICE') {
      return 'AOS Device';
    }
    if (str === 'CAMERA') {
      return 'IP Camera';
    }
    if (str === 'VR_DEVICE') {
      return 'VR Device';
    }
    let i, frags = str.split('_');
    for (i = 0; i < frags.length; i++) {
      frags[i] = frags[i].substr(0, 1).toUpperCase() +
        (frags[i].length > 1 ? frags[i].substr(1).toLowerCase() : '');
    }
    return frags.join(' ');
  }
}
