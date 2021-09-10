import {
  Area as AreaDb,
  AreasRestService,
  DeviceSearch,
  Floor,
  Infrastructure, InfrastructureRestService,
  Station as StationDb,
  StationsRestService,
  Device as DeviceDb
} from '@aitheon/smart-infrastructure';
import { GraphsRestService } from '@aitheon/system-graph';
import { SystemsRestService, System } from '@aitheon/device-manager';
import { Injectable } from '@angular/core';
import { catchError, take, tap } from 'rxjs/operators';
import { Observable, forkJoin, of } from 'rxjs';
import { AreasService, InfrastructureMapService, Area, Station, Device } from '../infrastructure-map';
import { OrganizationsService } from '../shared/services/organizations.service';

@Injectable({
  providedIn: 'root'
})
export class StructureService {
  private infrastructure: Infrastructure;
  private currentFloor: Floor;

  constructor(
    private areasRestService: AreasRestService,
    private stationsRestService: StationsRestService,
    private infrastructureRestService: InfrastructureRestService,
    private infrastructureMapService: InfrastructureMapService,
    private graphsRestService: GraphsRestService,
    private areasService: AreasService,
    private systemsRestService: SystemsRestService,
  ) {
  }

  setInfrastructure(infrastructure: Infrastructure): void {
    this.infrastructure = infrastructure;
  }

  getInfrastructure(): Infrastructure {
    return this.infrastructure;
  }

  setCurrentFloor(floor: Floor): void {
    this.currentFloor = floor;
  }

  getCurrentFloor(): Floor {
    return this.currentFloor;
  }

  public getFloorShapes(floorId: string): Observable<[AreaDb[], StationDb[], DeviceDb[]]> {
    return forkJoin([
      this.areasRestService.list(null, floorId),
      this.stationsRestService.list(null, floorId),
      this.infrastructureRestService.searchDevices({
        infrastructure: this.getInfrastructure()?._id,
        floors: [this.getCurrentFloor()?._id],
        typeNames: ['CAMERA', 'ANCHOR']
      } as DeviceSearch)
    ]).pipe(take(1));
  }

  /** AREAS SECTION */

  public saveActiveArea(): Observable<AreaDb> {
    const activeArea = this.infrastructureMapService.getActiveShape() as Area;
    if (activeArea) {
      const areaData = activeArea.getData();
      return this.createArea(areaData).pipe(tap(area => {
          this.areasService.hideRoutePointControl();
          activeArea.update(area);
          this.infrastructureMapService.setActiveShape(null);
          this.infrastructureMapService.setMode(null);
        },
        catchError((error) => {
          this.areasService.hideRoutePointControl();
          this.infrastructureMapService.removeActiveShape()
          this.infrastructureMapService.setMode(null);
          return error;
        })));
    }

    return of(null);
  }

  public createArea(area: any): Observable<AreaDb> {
    const infrastructure = this.getInfrastructure();
    const floor = this.getCurrentFloor();
    if (infrastructure && floor) {
      return this.areasRestService.create({
        ...area,
        infrastructure: infrastructure._id,
        floor: floor._id,
      });
    }
    return of(null);
  }

  public saveEditedArea(): Observable<any> {
    const editingAreaInstance = this.infrastructureMapService.getActiveShape() as Area;
    this.infrastructureMapService.makeShapesActive();
    if (editingAreaInstance) {
      const areaData = editingAreaInstance.getData() as any;
      return this.areasRestService.update(editingAreaInstance.id, areaData).pipe(tap(areaDb => {
          this.areasService.hideRoutePointControl();
          editingAreaInstance.update(areaDb);
          this.infrastructureMapService.setMode(null);
          this.infrastructureMapService.setActiveShape(null);
        },
        catchError((error) => {
          this.areasService.hideRoutePointControl();
          editingAreaInstance.dismissEdit();
          this.infrastructureMapService.setActiveShape(null);
          this.infrastructureMapService.setMode(null);
          return error;
        })));
    }
    return of(null);
  }

  public removeArea(areaId: string): Observable<any> {
    return this.areasRestService.remove(areaId);
  }

  /** AREAS SECTION END */

  /** STATIONS SECTION */

  saveActiveStation(): Observable<StationDb> {
    const activeStation = this.infrastructureMapService.getActiveShape() as Station;
    if (activeStation) {
      const stationData = activeStation.getData();
      if (activeStation.saved) {
        return this.updateStation(activeStation.id, stationData).pipe(tap((station => {
            activeStation.update(station);
            this.infrastructureMapService.setMode(null);
          })),
          catchError((error) => {
            this.infrastructureMapService.setActiveShape(null);
            this.infrastructureMapService.setMode(null);
            return error as Observable<StationDb>;
          }));
      }
      
      return this.createStation(stationData).pipe(tap(station => {
          activeStation.update(station);
          this.infrastructureMapService.setMode(null);
        },
        catchError((error) => {
          this.infrastructureMapService.removeShape(activeStation.id);
          this.infrastructureMapService.setMode(null);
          return error;
        })));
    }

    return of(null);
  }

  public createStation(station: any): Observable<StationDb> {
    const infrastructure = this.getInfrastructure();
    const floor = this.getCurrentFloor();
    if (infrastructure && floor) {
      return this.stationsRestService.create({
        ...station,
        infrastructure: infrastructure._id,
        floor: floor._id,
      });
    }
    return of(null);
  }

  public updateStation(stationId: string, station: any): Observable<StationDb> {
    return this.stationsRestService.update(stationId, station);
  }

  public removeStation(stationId: string): Observable<any> {
    const stationView = this.infrastructureMapService.getShapeById(stationId) as Station;
    // @ts-ignore
    if (stationView?.type === 'WORK') {
      return this.removeStationFromFloor(stationView);
    }
    return this.stationsRestService.remove(stationId);
  }

  private removeStationFromFloor(station: Station): Observable<any> {
    const infrastructure = this.getInfrastructure();
    const floor = this.getCurrentFloor();
    if (floor && infrastructure) {
      return forkJoin([
        this.stationsRestService.update(station.id, {
          floor: null,
          shape: null,
        } as any),
        this.systemsRestService.update(station.dbData.system, { parent: infrastructure.system._id} as System),
        this.graphsRestService.removeStationFromFloor({
          infrastructureId: infrastructure._id,
          floorId: floor._id,
          stationId: station.id,
          name: station?.dbData?.name
        }),
      ]);
    }
    return of(null);
  }

  public putStationOnMap(): Observable<any> {
    const activeStation = this.infrastructureMapService.getActiveShape() as Station;
    const infrastructure = this.getInfrastructure();
    const floor = this.getCurrentFloor();
    const system = activeStation?.dbData?.system;
    if (activeStation && floor && infrastructure && system) {
      const stationData = activeStation.getData();
      const dataToSave = {
        floor: floor._id,
        infrastructure: infrastructure._id,
        system,
        name: stationData.name,
        shape: stationData.shape,
      } as any;
      return this.stationsRestService.putOnMap(activeStation.id, dataToSave).pipe(
        tap(station => {
          if (station) {
            activeStation.update(station);
          } else {
            activeStation.destroy();
          }
        }));
    }
    if (activeStation) {
      activeStation.destroy();
    }
    return of(null);
  }

  /** STATIONS SECTION END */

  updateDevice(deviceID: string, isRemoving?: boolean): Observable<any> {
    const floor = this.getCurrentFloor();
    const infrastructure = this.getInfrastructure();
    const deviceView = this.infrastructureMapService.getActiveShape() as Device;
    const position = deviceView.coordinates;
    if (deviceID && floor && deviceView && infrastructure) {
      const updatedDevice = {
        // ...device,
        _id: deviceID,
        currentPosition: isRemoving ? null : {
          translation: {
            x: position.x,
            y: position.y
          },
        },
        floor: isRemoving ? null : floor?._id,
        additionalInfo: {},
      };
      return this.infrastructureRestService.updateDevice(deviceID, updatedDevice as any)
        .pipe(tap(device => {
          deviceView.update(device);
        }));
    }
    return of(null);
  }
}
