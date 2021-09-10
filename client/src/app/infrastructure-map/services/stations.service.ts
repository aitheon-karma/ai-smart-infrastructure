import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Station } from '../shapes';
import { InfrastructureMapService } from './infrastructure-map.service';

@Injectable({
  providedIn: 'root',
})
export class StationsService {
  private _stationToAdd: any;
  public stationSelected = new Subject<string>();
  public stationPlaced = new Subject<Station>();

  constructor(
    private infrastructureMapService: InfrastructureMapService,
  ) {}

  public onStationSelected(stationId: string): void {
    this.infrastructureMapService.setActiveShape(stationId);
    this.stationSelected.next(stationId);
  }

  public onEditStation(stationId: string): void {
    this.infrastructureMapService.setActiveShape(stationId);
    this.infrastructureMapService.makeShapesReadonly();
    this.infrastructureMapService.showAreaForm(null);
    const editingStation = this.infrastructureMapService.getShapeById(stationId) as Station;
    
    if (editingStation) {
      editingStation.startEdit();
      this.infrastructureMapService.showAreaForm(editingStation.getData(), true);
    }
  }

  public onStationPlaced(station: Station): void {
    this.stationPlaced.next(station);
    this.infrastructureMapService.setStartDrawing(true);
    this.infrastructureMapService.setNewShapeDrawing(true);
    this.infrastructureMapService.makeShapesReadonly(station.id);
    this.infrastructureMapService.showAreaForm({ type: station.type, name: '' });
  }

  public setStationToAdd(station: any): void {
    this._stationToAdd = station;
  }

  get stationToAdd(): any {
    return this._stationToAdd;
  }
}
