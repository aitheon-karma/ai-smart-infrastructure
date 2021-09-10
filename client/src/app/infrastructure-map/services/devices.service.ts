import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { InfrastructureMapService } from './infrastructure-map.service';
import { Device } from './../shapes/device'
import { Coordinates } from '..';

@Injectable({
  providedIn: 'root'
})
export class DevicesService {
  private _deviceSelected$ = new Subject<{
    deviceId: string,
    coordinates: Coordinates,
  }>();
  private _devicePlaced$ = new Subject<void>();

  constructor(
    private infrastructureMapService: InfrastructureMapService,
  ) {}

  public get deviceSelected$(): Observable<{
    deviceId: string,
    coordinates: Coordinates,
  }> {
    return this._deviceSelected$.asObservable();
  }

  public get devicePlaced$(): Observable<void> {
    return this._devicePlaced$.asObservable();
  }

  public onDeviceSelect(deviceId: string, coordinates: Coordinates): void {
    this.infrastructureMapService.setActiveShape(deviceId);
    this._deviceSelected$.next({
      deviceId,
      coordinates,
    });
  }

  public onEditDevice(deviceId: string): void {
    this.infrastructureMapService.setActiveShape(deviceId);
    const editingDevice = this.infrastructureMapService.getShapeById(deviceId) as Device;
    if (editingDevice) {
      editingDevice.startEdit();
      this.infrastructureMapService.showAreaForm({ type: editingDevice.type, deviceID :editingDevice.id}, true);
      this.infrastructureMapService.makeShapesReadonly(deviceId);
    }
  }

  public onDevicePlaced(type: any): void {
    this._devicePlaced$.next();
    this.infrastructureMapService.showAreaForm({ type, name: '' });
    this.infrastructureMapService.setNewShapeDrawing(true);
    this.infrastructureMapService.setStartDrawing(true);
    this.infrastructureMapService.makeShapesReadonly();
  }
}
