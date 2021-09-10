import { Injectable } from '@angular/core';

import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { Device, Area, Waypoint, Station } from '../shapes';
import { InfrastructureMapMode } from '../shared/enums/infrastructure-map-mode.enum';
import { Coordinates } from '../shared/interfaces/coordinates.interface';

import { ShapeInfo, Intersection } from 'kld-intersections';
import { IntersectionQuery } from 'kld-intersections';

export type Shape = Area | Station | Waypoint | Device;
type Include = 'ALL' | 'AREAS' | 'RESTRICTED' | 'STATIONS';

export enum DropdownAction {
  ADD_TASK = 'ADD_TASK',
  EDIT = 'EDIT',
  REMOVE = 'REMOVE',
}

@Injectable({
  providedIn: 'root'
})
export class InfrastructureMapService {
  private _mapScale$ = new BehaviorSubject<number>(1);
  private _editorMouseMoved$ = new Subject<MouseEvent>();
  private _hint$ = new Subject<{ message: string }>();
  public modeSetted = new BehaviorSubject<InfrastructureMapMode>(null);
  public triggerAreaForm = new BehaviorSubject<{ data?: any, existing: boolean }>({ data: null, existing: false });

  public areaFormUpdated = new Subject<{ value: any, areaId: string }>();
  public areaFormClosed = new Subject<void>();
  public addTask = new Subject<string>();

  public mapTranslationRestricted = new Subject<boolean>();
  public startDrawing = new Subject<boolean>();
  public mapClicked = new Subject<void>();
  public mapMouseMoved = new Subject<void>();
  public shapeIntersectionChanged = new Subject<{
    intersects: boolean,
    shapeId: string,
  }>();
  public shapeDropdownActionTriggered = new Subject<{
    action: DropdownAction,
    shapeId: string,
  }>();
  public shapeOptionsDropdownCalled = new Subject<{
    coordinates: Coordinates,
    dbData: any,
  }>();
  public shapeOptionsDropdownClosed = new Subject<string>();
  public newShapeDrawingStarted: boolean;
  private id = 'id' + Math.random().toString(16).slice(2);
  private _floor: any;
  mapMode: InfrastructureMapMode;
  readonly: boolean;
  shapes: Shape[] = [];
  activeShapeId: string;
  isProd: boolean;

  public addShape(shape: Area | Station | Waypoint | Device): void {
    this.shapes.push(shape);
  }

  public removeShape(shapeId: string): void {
    const shapeToRemove = this.getShapeById(shapeId);
    if (shapeToRemove) {
      shapeToRemove.destroy();
      this.shapes = this.shapes.filter(({ id }) => id !== shapeId);
    }
  }

  public removeActiveShape(): void {
    const activeShape = this.getActiveShape();
    if (activeShape) {
      this.removeShape(activeShape.id);
      this.setActiveShape(null);
    }
  }

  public clearShapes(): void {
    for (const shape of this.shapes) {
      shape.destroy();
    }
    this.shapes = [];
  }

  public setActiveShape(id: string): void {
    this.activeShapeId = id;
  }

  public getActiveShape(): Shape {
    return this.shapes.find(({ id }) => id === this.activeShapeId);
  }

  public getShapeById(shapeId: string): Shape {
    return this.shapes.find(({ id }) => id === shapeId);
  }

  public makeShapesReadonly(id?: string): void {
    for (const shape of this.shapes) {
      if (shape.id !== id && (shape instanceof Area || shape instanceof Station || shape instanceof Device)) {
        shape.setReadonly();
        shape.onSetReadOnly(shape.id);
      }
    }
  }

  public makeShapesActive(): void {
    for (const shape of this.shapes) {
      if (shape) {
        shape.setActive();
        shape.onActive();
      }
    }
  }

  public transparentize(id?: string): void {
    for (const shape of this.shapes) {
      if (shape.id !== id && (shape instanceof Area || shape instanceof Station || shape instanceof Device)) {
        shape.transparentize();
      }
    }
  }

  public makeAllShapesVisible(): void {
    for (const shape of this.shapes) {
      if (shape instanceof Area || shape instanceof Station || shape instanceof Device) {
        shape.visible();
      }
    }
  }

  public removeHighlightFromActiveShape(activeShapeId?: string): void {
    const activeShape = this.getActiveShape();
    if (activeShape) {
      if (activeShapeId && activeShapeId === activeShape.id) {
        return;
      }

      activeShape.removeHighlight();
    }
  }

  public highlightShape(shapeId: string): void {
    this.removeHighlightFromActiveShape(shapeId);
    const shapeToHighlight = this.getShapeById(shapeId);
    if (shapeToHighlight) {
      this.setActiveShape(shapeId);
      shapeToHighlight.highlight();
      return;
    }
  }

  public setMode(mode: InfrastructureMapMode): void {
    this.mapMode = mode;
    this.modeSetted.next(mode);

    if (mode) {
      this.transparentize();
    } else {
      this.makeAllShapesVisible();
      this.makeShapesActive();
    }
  }

  public onEditorMouseMove(event: MouseEvent): void {
    this._editorMouseMoved$.next(event);
  }

  public setMapTranslateRestriction(restricted: boolean): void {
    this.mapTranslationRestricted.next(restricted);
  }

  public getMapMode(): InfrastructureMapMode {
    return this.mapMode;
  }

  public setNewShapeDrawing(value): void {
    this.newShapeDrawingStarted = value;
  }

  public getNewShapeDrawing(): boolean {
    return this.newShapeDrawingStarted;
  }

  public setStartDrawing(value): void {
    this.startDrawing.next(value);
  }

  public isStartDrawing() {
    return this.startDrawing.asObservable();
  }

  public showAreaForm(data: any | null, existing?: boolean): void {
    this.triggerAreaForm.next({
      data,
      existing,
    });
  }

  public hideAreaForm(): void {
    this.areaFormClosed.next();
  }

  public onAreaFormUpdated(value: { name?: string, backgroundColor?: string, type?: string, device?: any, isFormValid?: boolean }): void {
    this.areaFormUpdated.next({
      value,
      areaId: this.activeShapeId,
    });
  }

  public onShapeIntersectionChange(intersects: boolean, shapeId: string): void {
    this.shapeIntersectionChanged.next({
      intersects,
      shapeId,
    });
  }

  public setMapScale(scale: number): void {
    this._mapScale$.next(scale);
  }

  public onAddTask(areaId: string): void {
    this.addTask.next(areaId);
  }

  public setReadonly(readonly: boolean): void {
    this.readonly = readonly;
  }

  public isReadonly(): boolean {
    return this.readonly;
  }

  public onMapClick(): void {
    this.mapClicked.next();
  }

  public onMapMouseMove(): void {
    this.mapMouseMoved.next();
  }

  public isShapeLinesIntersect(selectedShapePoints: Coordinates[], shapeId: string, include: Include[]): boolean {
    const shapes = this.getGroupedShapes(include);
    const poly = ShapeInfo.polygon(...selectedShapePoints.map(point => ([point.x, point.y])));
    for (const shape of shapes) {
      if (shape.id !== shapeId) {
        const anotherPoly = ShapeInfo.polygon(...shape.points.map(point => ([point.x, point.y])));
        if (Intersection.intersect(poly, anotherPoly).status === 'Intersection') {
          return true;
        }
      }
    }
    return false;
  }

  public checkShapesIntersection(points: Coordinates[], shapeId: string, include: Include[]): boolean {
    const shapes = this.getGroupedShapes(include);
    for (const shape of shapes) {
      if (shape.id !== shapeId) {
        for (const point of points) {
          if (IntersectionQuery.pointInPolygon(point, shape.points)) {
            return true;
          }
        }
        for (const point of shape.points) {
          if (IntersectionQuery.pointInPolygon(point, points)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getGroupedShapes(include: Include[]): (Area | Station)[] {
    let shapes = [];
    for (const type of include) {
      switch (type) {
        case 'ALL':
          shapes = this.shapes;
          break;
        case 'AREAS':
          shapes = [...shapes, ...this.areas];
          break;
        case 'RESTRICTED':
          shapes = [...shapes, ...this.restrictedAreas];
          break;
        case 'STATIONS':
          shapes = [...shapes, ...this.stations];
          break;
        default:
          break;
      }
    }
    return shapes;
  }

  public cancelEditing(): void {
    const editingShapeInstance = this.getActiveShape() as any;
    if (editingShapeInstance) {
      editingShapeInstance.dismissEdit();
      this.setActiveShape(null);
      this.makeShapesActive();
    }
    this.setMode(null);
  }

  public onShapeDropDownAction(action: DropdownAction, shapeId: string): void {
    this.shapeDropdownActionTriggered.next({
      action,
      shapeId,
    });
  }

  public showShapeOptionsDropdown(coordinates: Coordinates, dbData: any): void {
    if (dbData._id !== this.activeShapeId) {
      this.removeHighlightFromActiveShape();
    }
    this.highlightShape(dbData._id);
    this.shapeOptionsDropdownCalled.next({
      coordinates,
      dbData,
    });
  }

  onShapeOptionsDropdownClose(shapeId: string): void {
    this.shapeOptionsDropdownClosed.next(shapeId);
  }

  setEnvironment(isProd: boolean): void {
    this.isProd = isProd;
  }

  setHint(data?: { message: string }): void {
    this._hint$.next(data);
  }

  getEnvironment(): boolean {
    return this.isProd;
  }

  registerFloor(floor: any): void {
    this._floor = floor;
  }

  public hideShapeName(shapeId: string) {
    if (shapeId) {
      let shape = this.getShapeById(shapeId);
      shape.hideShapeName();
    }
  }

  public showShapeName(shapeId: string) {
    if (shapeId) {
      let shape = this.getShapeById(shapeId);
      shape.showShapeName();
    }
  }

  /* GETTERS */

  get floor(): any {
    return this._floor;
  }

  get areas(): Area[] {
    return this.shapes.filter(shape => shape instanceof Area) as Area[];
  }

  get restrictedAreas(): Area[] {
    return this.areas.filter(area => area.isRestricted);
  }

  get stations(): Station[] {
    return this.shapes.filter(shape => shape instanceof Station) as Station[];
  }

  public get mapId(): string {
    return this.id;
  }

  public get mapScale$(): Observable<number> {
    return this._mapScale$.asObservable();
  }

  public get hint$(): Observable<{ message: string }> {
    return this._hint$.asObservable();
  }

  public get editorMouseMoved$(): Observable<MouseEvent> {
    return this._editorMouseMoved$.asObservable();
  }

  getMapScale() {
    return this._mapScale$.getValue();
  }
}
