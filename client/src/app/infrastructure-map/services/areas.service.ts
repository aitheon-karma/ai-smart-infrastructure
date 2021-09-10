import { MapOverlay } from '@aitheon/smart-infrastructure';
import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ShapeRouteType } from '../shared/enums/area-route-type.enum';
import { RoutePointAction } from '../shared/enums/route-point-action.enum';
import { BoundingRect } from '../shared/interfaces/bounding-rect.interface';
import { Coordinates } from '../shared/interfaces/coordinates.interface';
import { Quaternion } from '../shared/interfaces/quaternion.interface';
import { InfrastructureMapService } from './infrastructure-map.service';
import { Area } from '../shapes/area';
import * as quaternion from 'quaternion';
import { blob } from 'aws-sdk/clients/codecommit';

interface RoutePointData {
  coordinates: Coordinates;
  type: ShapeRouteType;
  pointId: string;
  areaId: string;
  isLast: boolean;
  pointIndex: number;
  isEdit: boolean;
  restrictRemoval: boolean;
  chargeStation?: boolean;
  chargeStationType?: string
}

@Injectable({
  providedIn: 'root'
})
export class AreasService {
  public openCommandsModal = new Subject<{ areaId: string, pointId: string, commands: string[], coordinates: Coordinates, isEdit: boolean }>();
  public routePointSelected = new Subject<RoutePointData>();
  public routePointDropped = new Subject<{ hide: boolean; areaId: string, coordinates: Coordinates }>();
  public activePointMoved = new Subject<{ coordinates: Coordinates, shapeId: string }>();
  public activeRoutePointChanged = new Subject<{ pointId, commands }>();
  public routePointActionFired = new Subject<{
    action: RoutePointAction,
    areaId: string,
    type?: ShapeRouteType;
    meta?: any;
  }>();
  public routePointNcSaved = new Subject<{ commands: string[], pointId: string, areaId: string }>();
  public triggerRoutePointControlHide = new Subject<void>();
  public areaSelected = new Subject<{ areaId: string, boundingRect: BoundingRect }>();
  private _overlay$ = new BehaviorSubject<{
    [key: string]: MapOverlay,
  }>({});
  private _showTasksProgress$ = new BehaviorSubject<boolean>(true);

  constructor(
    private infrastructureMapService: InfrastructureMapService,
  ) {}

  public get overlay$(): Observable<{ [key: string]: MapOverlay }> {
    return this._overlay$.asObservable();
  }

  public get showTaskProgress$(): Observable<boolean> {
    return this._showTasksProgress$.asObservable();
  }

  public onOpenCommandsModal(data: { areaId: string, pointId: string, coordinates: Coordinates, isEdit: boolean; }): void {
    const area = this.infrastructureMapService.getShapeById(data.areaId) as Area;
    const commands = area.getCommandsByPointId(data.pointId);
    this.openCommandsModal.next({
      ...data,
      commands,
    });

    this.infrastructureMapService.setMapTranslateRestriction(true);
  }

  public onEditArea(areaId: string): void {
    this.infrastructureMapService.setActiveShape(areaId);
    const editingAreaInstance = this.infrastructureMapService.getActiveShape() as Area;
    if (editingAreaInstance) {
      editingAreaInstance.startEdit();
      const data = editingAreaInstance.getData();
      this.infrastructureMapService.showAreaForm(data, true);
      this.infrastructureMapService.makeShapesReadonly(areaId);
    }
  }

  public onAreaSelect(boundingRect: BoundingRect, areaId: string): void {
    this.areaSelected.next({
      boundingRect,
      areaId,
    });
    this.infrastructureMapService.setActiveShape(areaId);
  }

  public onRoutePointSelect(data: RoutePointData): void {
    this.routePointSelected.next(data);
  }

  public onRoutePointNcSave(commands: string[], pointId, areaId: string): void {
    this.routePointNcSaved.next({
      commands,
      pointId,
      areaId,
    });

    this.infrastructureMapService.setMapTranslateRestriction(false);
  }

  public onActivePointMove(data): void {
    this.activePointMoved.next(data);
  }

  public onRoutePointControlAction(data: {
    action: RoutePointAction;
    areaId: string;
    meta?: any;
    type?: ShapeRouteType;
  }): void {
    this.routePointActionFired.next(data);
  }

  public changeActiveRoutePoint(pointId, commands: string[]): void {
    this.activeRoutePointChanged.next({
      pointId,
      commands,
    });
  }

  public onRoutePointDrop(coordinates: Coordinates, areaId: string, hide?: boolean): void {
    this.routePointDropped.next({
      areaId,
      coordinates,
      hide,
    });
  }

  public hideRoutePointControl(): void {
    this.triggerRoutePointControlHide.next();
  }

  public setAreaOverlay(overlay: MapOverlay, areaId: string): void {
    const value = this._overlay$.getValue();
    this._overlay$.next({ ...value, [areaId]: overlay })
  }

  public areaOverlay(areaId: string): Observable<MapOverlay> {
    return this.overlay$.pipe(
      filter(overlay => !!overlay[areaId]),
      map(overlay => overlay[areaId]),
    );
  }

  public showTasksProgress(progress: boolean): void {
    this._showTasksProgress$.next(progress);
  }


  public calculateDegRotation(w = 0): number {
    if (Math.abs(w) > 1) {
      return 0;
    }
    const radians = 2 * Math.acos(w);
    return Math.round(radians * 180 / Math.PI);
  }

  getRadians(angleDeg: number): number {
    return angleDeg * Math.PI / 180.0;
  }

  getQuaternion(angleDeg: number): Quaternion {
    const radians = this.getRadians(angleDeg);
    const q = quaternion.fromAxisAngle([0, 0, -1], radians);
    if (Math.abs(q.w) > 1) {
      q.w = 0;
    }
    return q;
  }

  public calculateAngle(firstPoint: Coordinates, secondPoint: Coordinates): number {
    const dy = secondPoint.y - firstPoint.y;
    const dx = secondPoint.x - firstPoint.x;
    let theta = Math.atan2(dy, dx);
    theta *= 180 / Math.PI;
    theta -= 90;
    if (theta < 0) theta = 360 + theta;
    if (theta > 360) theta = theta - 360;
    return Math.round(theta);
  }

  rotatePoint(origin: Coordinates, point: Coordinates, angle: number): Coordinates {
    const angleRad = angle * Math.PI / 180.0;
    return {
      x: Math.cos(angleRad) * (point.x - origin.x) - Math.sin(angleRad) * (point.y - origin.y) + origin.x,
      y: Math.sin(angleRad) * (point.x - origin.x) + Math.cos(angleRad) * (point.y - origin.y) + origin.y
    };
  }

  public getPointAbsoluteRotation(origin: Coordinates, pointCoords: Coordinates, angle: number): Coordinates {
    const currentRotation = this.calculateAngle(origin, pointCoords);
    let relativeAngle = angle - currentRotation;
    if (angle < 0) {
      relativeAngle += 360;
    }
    return this.rotatePoint(origin, pointCoords, relativeAngle);
  }
}
