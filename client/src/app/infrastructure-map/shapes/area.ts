import { MapOverlay, Rotation } from '@aitheon/smart-infrastructure';
import * as d3 from 'd3';

import { Subscription } from 'rxjs';
import { ShapeRouteType } from '../shared/enums/area-route-type.enum';
import { AreaType } from '../shared/enums/area-type.enum';
import { RoutePointAction } from '../shared/enums/route-point-action.enum';
import { Coordinates } from '../shared/interfaces/coordinates.interface';
import { AreasService } from '../services/areas.service';
import { InfrastructureMapService } from '../services/infrastructure-map.service';
import { IntersectionQuery } from 'kld-intersections';
import { Tooltip } from '../shared/tooltip';
import { Text } from '../shared/text';
import { CircleProgress } from './circle-progress';
import { Shape } from './shape';
import { findTopLeftPointFromPoints } from '../utils/find-top-left-point-from-points';

import { getAreaBoundingRect } from '../utils/get-area-bounding-rect';
import { getCenterCoordinatesFromPoints } from '../utils/get-center';
import { hexToRGB } from '../utils/hexToRgba';
import { uuidv4 } from '../utils/uuidv4';
import { Observable } from 'rxjs'
import { filter, take, withLatestFrom } from 'rxjs/operators';

interface Point {
  circle: any;
  fromLine: any;
  toLine?: any;
  routeType: any;
  id: string;
  rotation: Rotation;
  rotationControl?: {
    line: any;
    circle: any;
  };
}

export class Area extends Shape {
  public isRestricted: boolean;
  activePointSubscription: Subscription;
  areaType: AreaType;
  originPoint: {
    text?: any,
    circle?: any,
    rect?: any,
    rotation?: Rotation;
    rotationControl?: {
      line: any;
      circle: any;
    };
  };
  entryPoints: Point[] = [];
  exitPoints: Point[] = [];
  editingControls: any[] = [];
  bordersColor: string;
  fillColor: string;
  color: string;
  name: string;
  activePoint: Point;
  activePointType: ShapeRouteType;
  selected: boolean;
  overlayImage: any;
  ncCommands: {
    [key: string]: string[],
  } = {};
  private circleProgress: CircleProgress;
  private overlay$: Observable<MapOverlay>;
  originPointPosition = {
    x: 0,
    y: 0
  };
  textValue: any;

  get area(): any {
    return this.group.select(`[data-id="${this.id}"]`);
  }

  constructor(
    view: any,
    infrastructureMapService: InfrastructureMapService,
    dbData: any,
    private areasService: AreasService,
  ) {
    super(view, dbData, infrastructureMapService);
    this.saved = !!dbData._id;
    this.readonly = this.infrastructureMapService.isReadonly();
    this.initArea();
  }

  private initArea(): void {
    this.id = this.dbData._id ? this.dbData._id : uuidv4();
    this.overlay$ = this.areasService.areaOverlay(this.id);
    this.areaType = this.dbData.type as any || AreaType.TARGET;
    this.group = this.view.append("g");

    this.group.append('polygon')
      .data([this.dbData.shape.polygonPoints])
      .attr('data-id', this.id)
      .attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '))
      .style('cursor', 'pointer');

    this.isRestricted = this.areaType === AreaType.RESTRICTED;

    if (!this.saved) {
      this.setAreaColor('#dcbc65');
      this.editing = true;
      this.infrastructureMapService.setActiveShape(this.id);
      this.infrastructureMapService.showAreaForm(this.dbData);
      this.infrastructureMapService.setNewShapeDrawing(true);
      this.infrastructureMapService.makeShapesReadonly();
      this.addPointControls();
    } else {
      this.setAreaProperties();
      if (!this.isRestricted) {
        this.addOriginPoint();
        this.setNcCommands();
      } else {
        this.addTitle();
      }

      if (this.dbData.hideName) {
        this.hideShapeName();
      }
    }
    if (!this.readonly) {
      this.setListeners();
    }
  }

  private setListeners(): void {
    this.onRoutePointAction();
    this.onAreaSelect();
    this.onNcCommandsSave();
    this.onAreaFormUpdate();
    this.listenToOptionsDropdownClose();
    this.onContextMenu();
    this.onOverlayChange();
    this.onRoutePointDrop();
    this.onMapClick();
  }

  onMapClick(): void {
    this.subscriptions$.add(this.infrastructureMapService.mapClicked.subscribe(() => {
      if (this.editing) {
        this.removeRotationControl(this.originPoint as any);
      }
      if (this.selected && !this.editing && !this.hovered) {
        this.selected = false;
        this.removeHighlight();
      }
    }));
  }

  private addInitPoints(): void {
    this.addOriginPoint();
    this.addRoutePoint(ShapeRouteType.ENTRY);
    this.addRoutePoint(ShapeRouteType.EXIT);
    if (this.originPoint.circle) {
      this.originPoint.circle.raise();
    }
  }

  private setAreaProperties(): void {
    const {
      name,
      shape,
    } = this.dbData;
    this.name = name;
    const { styling = {} } = shape;
    this.setAreaColor(styling.backgroundColor);
  }

  private createRoutes(): void {
    if (this.entryPoints.length && this.exitPoints.length) {
      return;
    }
    const { routes } = this.dbData.interaction;
    for (const route of routes) {
      const { type, points } = route;
      for (const point of points) {
        this.ncCommands[point._id] = point.ncCommands;
        this.addRoutePoint(type as any, point.pose, point._id);
      }
    }
    if (this.originPoint.circle) {
      this.originPoint.circle.raise();
    }
  }

  private setNcCommands(): void {
    const { routes } = this.dbData.interaction;
    for (const route of routes) {
      const { points } = route;
      for (const point of points) {
        this.ncCommands[point._id] = point.ncCommands;
      }
    }
  }

  public hideRoutes(): void {
    for (const point of [...this.entryPoints, ...this.exitPoints]) {
      this.removeRoutePoint(point);
    }
    this.entryPoints = [];
    this.exitPoints = [];
  }

  private onAreaSelect(): void {
    this.area.on('mousedown', this.onMouseDown.bind(this));
    this.group.on('mouseover', () => {
      if (!this.editing) {
        this.textValue?.onTextHover();
        this.hovered = true;
      }
      });
    this.area.on('mouseout', () => {
      this.hovered = false;
      if (!this.editing) {
        this.textValue?.onTextLeave();
      }
    });
  }

  onContextMenu(): void {
    this.area.on('contextmenu', () => {
      if (!this.editing && !this.readonly && !this.infrastructureMapService.isReadonly() && this.saved) {
        this.openOptionsDropdown({ x: this.d3Event.clientX, y: this.d3Event.clientY });
      }
    });
  }

  public setActive(): void {
    this.readonly = false;
  }

  onMouseDown(e): void {
    if (!this.editing && this.saved && !this.infrastructureMapService.getMapMode() && !this.readonly) {
      this.highlight();
    }
  }

  onNcCommandsSave(): void {
    this.subscriptions$.add(this.areasService.routePointNcSaved.subscribe(({ commands, pointId, areaId }) => {
      if (areaId === this.id) {
        this.ncCommands[pointId] = commands;
      }
    }));
  }

  onAreaFormUpdate(): void {
    this.subscriptions$.add(this.infrastructureMapService.areaFormUpdated.subscribe(({ value, areaId }) => {
      if (areaId === this.id) {
        this.name = value.name;
        this.textValue.updateText(this.name);
        this.setAreaColor(value.backgroundColor);
        this.editingControls.forEach(control => {
          control.attr('fill', value.backgroundColor);
        });
        if (this.originPoint.circle) {
          this.originPoint.circle.attr('fill', value.backgroundColor);
        }
      }
    }));
  }

  private onRoutePointAction(): void {
    this.subscriptions$.add(this.areasService.routePointActionFired.subscribe(({ action, areaId }) => {
      if (this.activePoint && areaId === this.id) {
        const points = this.activePointType === ShapeRouteType.ENTRY ? this.entryPoints : this.exitPoints;
        switch (action) {
          case RoutePointAction.ADD:
            this.removeRotationControl(this.activePoint);
            this.addRoutePoint(this.activePointType, this.activePoint.circle.data()[0]);
            this.activePoint = points[points.length - 1];
            this.areasService.changeActiveRoutePoint(this.activePoint.id, this.ncCommands[this.activePoint.id]);
            break;
          case RoutePointAction.REMOVE:
            this.removeRoutePoint(this.activePoint);
            points.pop();
            this.activePointSubscription.unsubscribe();
            this.activePoint = points[points.length - 1];
            break;
          default:
            break;
        }
      }
    }));
  }

  private removeRoutePoint(point: Point): void {
    point?.fromLine?.remove();
    point?.circle?.remove();
    point?.toLine?.remove();
    this.removeRotationControl(point);
  }

  setAreaColor(color: string = '#dcbc65', highlight?: boolean): void {
    this.color = color;
    if (color.includes('#')) {
      this.bordersColor = this.isRestricted ? '#eeeeee' : color;
      this.fillColor = this.isRestricted && !highlight
        ? 'url(#striped-pattern)'
        : (this.isRestricted && highlight
          ? 'url(#striped-pattern-highlighted)'
          : hexToRGB(color, highlight ? 0.6 : 0.2));
    } else {
      this.fillColor = color;
      let updatedColor = color.replace('rgba', 'rgb');
      const lastComma = color.lastIndexOf(',');
      updatedColor = updatedColor.slice(0, lastComma - 1) + ')';
      this.bordersColor = this.isRestricted ? '#eeeeee' : updatedColor;
    }
    this.area.attr('fill', this.fillColor).attr('stroke', this.bordersColor);
  }

  private addOriginPoint(): void {
    this.originPointPosition = this.saved && !this.isRestricted
      ? this.dbData.interaction.originPose.translation
      : getCenterCoordinatesFromPoints(this.points);

    if (!this.saved && !IntersectionQuery.pointInPolygon(this.originPointPosition, this.points)) {
      this.originPointPosition = findTopLeftPointFromPoints(this.points);
    }

    const circleId = uuidv4();
    const textId = uuidv4();

    this.group.append('circle')
      .attr('data-id', circleId)
      .attr('r', 8)
      .attr('fill', this.bordersColor)
      .attr('cx', this.originPointPosition.x)
      .attr('cy', this.originPointPosition.y)
      .style('z-index', 100)
      .raise();

    this.textValue = new Text(this.group, this.name, this.originPointPosition, 'AREA');

    this.originPoint = {
      circle: this.group.select(`[data-id="${circleId}"]`),
      text: this.group.select(`[data-id="${textId}"]`),
      rotation: this.dbData?.interaction?.originPose?.rotation || this.defaultRotation,
    };
    
    this.listenToPoseEvents();
  }

  private listenToPoseEvents(): void {
    this.originPoint.circle.call(d3.drag()
      .on('start', () => {
        this.originPoint.text.raise();
        this.originPoint.circle.raise();
      }).on('drag', () => {
        if (this.originPoint.rotationControl) {
          this.removeRotationControl(this.originPoint as any);
        }
        const { offsetX, offsetY } = this.d3Event.sourceEvent;
        if (this.editing && !this.readonly && IntersectionQuery.pointInPolygon({
          x: offsetX,
          y: offsetY
        }, this.points)) {
          this.originPoint.circle.attr('cx', offsetX).attr('cy', offsetY);
          this.entryPoints[0].fromLine.attr('x1', offsetX).attr('y1', offsetY);
          this.exitPoints[0].fromLine.attr('x1', offsetX).attr('y1', offsetY);
          this.textValue.setCoordinates({x: offsetX, y: offsetY});
        }
      }));

    this.originPoint.circle.on('mouseover', () => {
      this.originPoint.circle.raise()
    });

    this.originPoint.circle.on('pointerdown', () => {
      if (this.editing && !this.readonly) {
        this.showPointRotationControl(this.originPoint as any, true);
      }
    });
  }

  private addRoutePoint(type: ShapeRouteType, pose?: any, pointId?: string): void {
    const { translation, rotation } = pose || {} as any;
    const areaBoundingRect = getAreaBoundingRect(this.points);
    const id = pointId ? pointId : uuidv4();
    const pointCoordinates = translation || {} as Coordinates;

    this.group.append('circle')
      .attr('data-id', id)
      .attr('r', 8)
      .style('fill', type === ShapeRouteType.ENTRY ? '#67B231' : '#E96058')
      .style('cursor', 'pointer');
    const circle = this.group.select(`[data-id="${id}"`);

    if (!translation) {
      pointCoordinates.y = areaBoundingRect.top + (areaBoundingRect.height / 2);
      pointCoordinates.x = type === ShapeRouteType.ENTRY ? areaBoundingRect.left - 16 : areaBoundingRect.right + 16;
    }

    const line = this.createRouteLine(pointCoordinates, type);
    circle
      .attr('cx', pointCoordinates.x)
      .attr('cy', pointCoordinates.y)
      .data([pointCoordinates]);

    const pointObject: Point = {
      fromLine: line,
      circle,
      id,
      routeType: type,
      rotation: rotation ? rotation : this.defaultRotation,
    };
    if (type === ShapeRouteType.ENTRY) {
      this.entryPoints.push(pointObject);
    } else {
      this.exitPoints.push(pointObject);
    }

    this.listenToRoutePointMove(pointObject);
    this.onRoutePointDrag(pointObject);
  }

  onRoutePointDrag(point: Point): void {
    point.circle.on('mouseover', () => {
      point.circle.raise();
    });

    point.circle.call(d3.drag()
      .on('drag', () => this.onPointDrag(point)));
  }

  onPointDrag(point: Point): void {
    if (this.editing && !this.readonly) {
      if (point.rotationControl) {
        this.removeRotationControl(point);
      }
      const { offsetX, offsetY } = this.d3Event.sourceEvent;
      point.circle.attr('cx', offsetX).attr('cy', offsetY);
      point.fromLine.attr('x2', offsetX).attr('y2', offsetY);
      if (point.toLine) {
        point.toLine.attr('x1', offsetX).attr('y1', offsetY);
      }
    }
  }

  createRouteLine(circleCoordinates: Coordinates, type: ShapeRouteType): any {
    let startCoordinates: Coordinates = {
      x: +this.originPoint.circle.attr('cx'),
      y: +this.originPoint.circle.attr('cy'),
    };

    let lastPoint;
    if (type === ShapeRouteType.ENTRY && this.entryPoints.length) {
      lastPoint = this.entryPoints[this.entryPoints.length - 1];
    }
    if (type === ShapeRouteType.EXIT && this.exitPoints.length) {
      lastPoint = this.exitPoints[this.exitPoints.length - 1];
    }

    if (lastPoint) {
      startCoordinates = {
        x: +lastPoint.circle.attr('cx'),
        y: +lastPoint.circle.attr('cy')
      };
    }

    const lineColor = type === ShapeRouteType.ENTRY ? '#67B231' : '#E96058';
    const lineId = uuidv4();
    this.group.append('line')
      .attr('data-id', lineId)
      .attr('x1', startCoordinates.x)
      .attr('y1', startCoordinates.y)
      .attr('x2', circleCoordinates.x)
      .attr('y2', circleCoordinates.y)
      .attr('stroke-width', 2)
      .attr('stroke', lineColor);

    const line = this.group.select(`[data-id="${lineId}"`);
    if (lastPoint) {
      lastPoint.toLine = line;
    }
    return line;
  }

  listenToRoutePointMove(routePoint: Point): void {
    routePoint.circle.on('click', () => {
      this.removeRotationControl(this.activePoint);
      this.removeRotationControl(this.originPoint as any);
      const coordinates = this.getPointCoordinates(routePoint);
      const { point, isLast, pointIndex, type } = this.getRoutePointById(routePoint.id);
      this.d3Event.stopPropagation();
      this.d3Event.preventDefault();
      this.activePoint = point;
      this.activePointType = type;
      this.infrastructureMapService.setActiveShape(this.id);
      this.areasService.onRoutePointSelect({
        coordinates,
        type: this.activePointType,
        pointId: routePoint.id,
        areaId: this.id,
        isLast,
        pointIndex,
        restrictRemoval: routePoint.routeType === ShapeRouteType.ENTRY ? this.entryPoints.length === 1 : this.exitPoints.length === 1,
        isEdit: this.editing && !this.readonly,
        chargeStation: false
      });
      this.listenToActivePointMove();

      if (this.editing && !this.readonly) {
        this.showPointRotationControl(point);
      }
    });
  }

  private removeRotationControl(point: Point): void {
    if (point?.rotationControl) {
      point.rotationControl?.line?.remove();
      point.rotationControl?.circle?.remove();
      point.rotationControl = null;
      this.infrastructureMapService.setHint();
    }
  }

  private getClientElementCoordinates(d3Shape: any): Coordinates {
    const rect = d3Shape?.node().getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  private getPointCoordinates(point: Point): Coordinates {
    return {
      x: +point.circle.attr('cx'),
      y: +point.circle.attr('cy')
    };
  }

  private showPointRotationControl(point: Point, isOrigin?: boolean): void {
    this.removeRotationControl(point);
    const coordinates = this.getPointCoordinates(point);
    const rotationAngle = this.areasService.calculateDegRotation(point.rotation.w);
    const controlPosition = this.areasService.getPointAbsoluteRotation(coordinates, {
      x: coordinates.x,
      y: coordinates.y + 80
    }, rotationAngle);
    const color = isOrigin ? this.color : point.routeType === ShapeRouteType.ENTRY ? '#67B231' : '#E96058';
    const line = this.group.append('line')
      .attr('x1', coordinates.x)
      .attr('y1', coordinates.y)
      .attr('x2', coordinates.x)
      .attr('y2', coordinates.y - 75)
      .attr('transform', `rotate(${rotationAngle + 180} ${coordinates.x} ${coordinates.y})`)
      .attr('stroke-width', 1)
      .attr('stroke', color);
    const circle = this.group.append('circle')
      .attr('r', 6)
      .attr('cx', controlPosition.x)
      .attr('cy', controlPosition.y)
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .attr('fill', 'transparent');

    point.rotationControl = { line, circle };
    point.circle.raise();

    this.addRotatePointListener(point);
    this.onPointHover(point);
  }

  onPointHover(point: Point): void {
    point.rotationControl?.circle.on('mouseenter', () => {
      const rotation = 360 - this.areasService.calculateDegRotation(point.rotation.w);
      this.infrastructureMapService.setHint({ message: `Rotation: ${rotation}°` });
    });

    point.rotationControl?.circle.on('mouseleave', () => {
      this.infrastructureMapService.setHint();
    });
  }

  addRotatePointListener(point: Point): void {
    point?.rotationControl?.circle.call(d3.drag()
      .on('drag', () => {
        const pointCoordinates = this.getPointCoordinates(point);
        const controlCoordinates = this.getPointCoordinates(point.rotationControl as any);
        const { clientX, clientY } = this.d3Event.sourceEvent;
        const angle = this.areasService.calculateAngle(
          this.getClientElementCoordinates(point.circle),
          { x: clientX, y: clientY },
        );
        const controlUpdatedPosition = this.areasService
          .getPointAbsoluteRotation(pointCoordinates, controlCoordinates, angle);
        point.rotationControl.circle
          .attr('cx', controlUpdatedPosition.x)
          .attr('cy', controlUpdatedPosition.y);
        point.rotationControl.line
          .attr('transform', `rotate(${angle + 180} ${pointCoordinates.x} ${pointCoordinates.y})`);
        point.rotation = this.areasService.getQuaternion(angle);
        this.infrastructureMapService.setHint({ message: `Rotation: ${360 - angle}°` });
      }));
  }

  private listenToActivePointMove(): void {
    this.activePointSubscription = this.areasService.activePointMoved.subscribe(({ coordinates, shapeId}) => {
      if (this.activePoint) {
        this.activePoint.circle
          .data([coordinates])
          .attr('cx', coordinates.x)
          .attr('cy', coordinates.y);

        this.activePoint.fromLine.attr('x2', coordinates.x).attr('y2', coordinates.y);
        this.activePoint.toLine?.attr('x1', coordinates.x).attr('y1', coordinates.y);
        if (this.activePoint.rotationControl) {
          this.removeRotationControl(this.activePoint);
        }
      }
    });
  }

  getRoutePointById(pointId: string): {
    point: Point,
    isLast: boolean,
    pointIndex: number,
    type: ShapeRouteType,
  } {
    const point = [...this.entryPoints, ...this.exitPoints].find(({ id }) => id === pointId);
    if (point) {
      const { routeType } = point;
      const points = routeType === ShapeRouteType.ENTRY ? this.entryPoints : this.exitPoints;
      const pointIndex = points.findIndex(({ id }) => id === pointId);
      return {
        point: points[pointIndex],
        isLast: pointIndex === (points.length - 1),
        pointIndex,
        type: routeType,
      };
    }
    return {
      point: null,
      isLast: false,
      pointIndex: 0,
      type: null,
    };
  }

  addPointControls(): void {
    if (!this.isRestricted) {
      this.addInitPoints();
    } else {
      this.addTitle();
    }
    this.showEdgeControls();
    if (this.originPoint.circle) {
      this.originPoint.circle.raise();
    }
  }

  showEdgeControls(): void {
    this.points.forEach((point, index) => {
      const pointId = uuidv4();
      const pointSelection = () => this.group.select(`[data-id="${pointId}"]`);
      const include = this.isRestricted ? ['AREAS', 'STATIONS'] : ['AREAS'] as any;

      this.group.append('circle')
        .attr('r', 6)
        .attr('fill', this.bordersColor)
        .attr('stroke', '#252525')
        .attr('stroke-width', 2)
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('data-id', pointId)
        .style('cursor', 'pointer')
        .call(d3.drag()
          // DRAG START
          .on('start', () => {
            pointSelection().raise();
          })
          // DRAGGED
          .on('drag', () => {
            const { x, y } = this.d3Event;
            const [poly] = this.area.data();
            const updatedPoints = [...poly];

            const intersects = this.infrastructureMapService.checkShapesIntersection(updatedPoints, this.id, include)
              || this.infrastructureMapService.isShapeLinesIntersect(updatedPoints, this.id, include);

            if (intersects) {
              this.showIntersectionWarning({ x, y });
            } else {
              this.hideIntersectionWarning();
            }

            updatedPoints.splice(index, 1, { x, y });
            this.area.data([updatedPoints]).attr('points', d => d.map(p => [p.x, p.y].join(',')).join(' '));
            pointSelection().attr('cx', x).attr('cy', y);
          })
          // DRAG END
          .on('end', () => {
            if (this.intersectionWarning) {
              this.area.data([this.points]).attr('points', d => d.map(p => [p.x, p.y].join(',')).join(' '));
              const coordinates = this.points[index];
              pointSelection().attr('cx', coordinates.x).attr('cy', coordinates.y);
              this.hideIntersectionWarning();
            }
          }));

      this.editingControls.push(pointSelection());
    });
  }

  showIntersectionWarning(coordinates: Coordinates): void {
    if (!this.intersectionWarning) {
      this.intersectionWarning = new Tooltip(this.group, 'Areas should not intersect');
      this.area.attr('fill', 'rgba(233, 88, 88, 0.2)').attr('stroke', '#e95858');
      this.infrastructureMapService.onShapeIntersectionChange(true, this.id);
    }
    this.intersectionWarning.setCoordinates(coordinates);
  }

  hideIntersectionWarning(): void {
    if (this.intersectionWarning) {
      this.intersectionWarning.destroy();
      this.intersectionWarning = null;
      this.setAreaColor(this.color);
      this.infrastructureMapService.onShapeIntersectionChange(false, this.id);
    }
  }

  hideEdgeControls(): void {
    this.editingControls.forEach(control => {
      control.remove();
    });
  }

  addTitle(): void {
    const { x, y } = getCenterCoordinatesFromPoints(this.points);
    const id = uuidv4();
    
    this.textValue = new Text(this.group, this.name, {x, y}, 'AREA');

    this.originPoint = {
      text: this.group.select(`[data-id="${id}"]`),
    };
  }

  public getData(): any {
    const area = {
      name: this.name,
      type: this.areaType,
      shape: {
        styling: {
          backgroundColor: this.color,
        },
        polygonPoints: this.area.data()[0].map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
      },
    } as any;
    if (!this.isRestricted) {
      area.interaction = {
        originPose: {
          rotation: this.originPoint.rotation || this.defaultRotation,
          translation: {
            x: Math.round(+this.originPoint.circle.attr('cx')),
            y: Math.round(+this.originPoint.circle.attr('cy')),
          },
        },
        routes: [
          this.getRoute(ShapeRouteType.ENTRY),
          this.getRoute(ShapeRouteType.EXIT),
        ],
      };
    }
    return area;
  }

  getRoute(routeType: ShapeRouteType): any {
    return {
      type: routeType,
      points: (routeType === ShapeRouteType.ENTRY ? this.entryPoints : this.exitPoints).map(point => ({
        usePreviousRotation: true,
        ncCommands: this.ncCommands[point.id] || [],
        pose: {
          rotation: point.rotation,
          translation: {
            x: Math.round(+point.circle.attr('cx')),
            y: Math.round(+point.circle.attr('cy')),
          } as Coordinates,
        },
      })),
    };
  }

  public update(areaDb: any, setNameAndColor?: boolean): void {
    if (!this.saved) {
      this.originPoint.text.on('mousedown', this.onMouseDown.bind(this));
      if (!this.isRestricted) {
        this.originPoint.circle.on('mousedown', this.onMouseDown.bind(this));
      }
      this.saved = true;
    }
    this.dbData = areaDb;
    this.area.attr('data-id', areaDb._id);
    this.id = areaDb._id;
    this.area.data([this.dbData.shape.polygonPoints]);
    this.hideRoutes();
    this.hideEdgeControls();
    
    if (setNameAndColor) {
      this.textValue.updateText(this.dbData.name);
      this.setAreaColor(this.dbData.shape.styling.backgroundColor);
      if (this.originPoint.circle) {
        this.originPoint.circle.attr('fill', this.bordersColor);
      }
    }

    this.editing = false;
    this.activePoint = null;
    this.checkAreaOverlay();
    this.removeRotationControl(this.originPoint as any);
    this.infrastructureMapService.setHint();
  }

  public startEdit(): void {
    this.editing = true;
    this.showEdgeControls();
    this.hideTaskProgress();
    if (!this.isRestricted) {
      this.createRoutes();
    }
  }

  public dismissEdit(): void {
    this.hideEdgeControls();
    this.hideRoutes();
    this.editing = false;
    this.area.data([this.points]).attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '));
    this.activePoint = null;
    this.checkAreaOverlay();
    this.removeRotationControl(this.originPoint as any);
    this.infrastructureMapService.setHint();
  }

  public highlight(): void {
    this.selected = true;
    this.checkAreaOverlay();
    if (!this.isRestricted) {
      this.createRoutes();
    }
    const boundingClientRect = this.getBoundingClientRect();
    if (this.d3Event?.button !== 2) {
      this.areasService.onAreaSelect(boundingClientRect, this.id);
    }
    this.setAreaColor(this.color, true);
  }

  private checkAreaOverlay(): void {
    this.overlay$.pipe(
      withLatestFrom(this.areasService.showTaskProgress$),
      take(1),
      filter(([overlay, show]) => show && !!overlay && !this.editing)
    ).subscribe(([overlay]) => {
      if (this.selected) {
        this.showOverlayImage(`data:image/png;base64,${overlay?.base64Image}`)
      } else {
        this.showCircleProgress(overlay)
      }
    });
  }

  public removeHighlight(): void {
    this.hideRoutes();
    this.setAreaColor(this.color);
    this.hideOverlayImage();
  }

  get points(): Coordinates[] {
    if (this.dbData && this.dbData.shape && this.dbData.shape.polygonPoints) {
      return this.dbData.shape.polygonPoints;
    }
    return [];
  }

  set points(points) {
    if (this.dbData && this.dbData.shape) {
      this.dbData.shape.polygonPoints = points;
    }
  }

  public setId(id: string): void {
    this.id = id;
    this.area.attr('data-id', id);
  }

  public getBoundingClientRect(): DOMRect {
    const polygon = this.area.node();
    return polygon.getBoundingClientRect();
  }

  public getId() {
    return this.id;
  }

  public getCommandsByPointId(pointId: string): string[] {
    return this.ncCommands[pointId];
  }

  public get type(): AreaType {
    return this.areaType;
  }

  public transparentize(): void {
    this.area.style('opacity', 0.5);
    this.originPoint.text.style('opacity', 0.5);

    if (this.originPoint.circle) {
      this.originPoint.circle.style('opacity', 0.5);
    }
  }

  public visible(): void {
    this.area.style('opacity', 1);
    this.originPoint.text.style('opacity', 1);

    if (this.originPoint.circle) {
      this.originPoint.circle.style('opacity', 1);
    }
  }

  public showOverlayImage(imageUrl: string): void {
    if (!this.overlayImage) {
      const areaRect = getAreaBoundingRect(this.points);
      this.overlayImage = this.group.append('svg:image')
        .style('pointer-events', 'none')
        .attr('x', areaRect.left)
        .attr('y', areaRect.top)
        .attr('width', areaRect.width)
        .attr('height', areaRect.height);
    }
    this.removeCircleProgress();
    this.overlayImage.attr('xlink:href', imageUrl);
    this.originPoint.circle?.raise();
    this.originPoint.text?.raise();
  }

  private showCircleProgress(overlay: MapOverlay): void {
    if (!this.circleProgress && !this.selected) {
      this.hideOriginPoint();
      this.circleProgress = new CircleProgress(this.group, {
        color: this.color,
        coordinates: this.dbData?.interaction?.originPose?.translation,
      });
    }
    this.circleProgress.setProgress(overlay.overallProgress);
  }

  public updateOverlayImage(imageUrl: string): void {
    this.overlayImage?.attr('xlink:href', imageUrl);
  }

  public hideOverlayImage(): void {
    if (this.overlayImage) {
      this.overlayImage.remove();
      this.overlayImage = null;
    }
    if (!this.editing) {
      this.areasService.showTaskProgress$.pipe(take(1), filter(s => s)).subscribe(() => {
        this.onShowCircleProgress();
      });
    }
  }

  onShowCircleProgress(): void {
    this.overlay$.pipe(take(1)).subscribe(overlay => {
      if (overlay) {
        this.showCircleProgress(overlay);
      }
    });
  }

  private onOverlayChange(): void {
    this.subscriptions$.add(this.overlay$.pipe(
      withLatestFrom(this.areasService.showTaskProgress$),
    ).subscribe(([overlay, show]) => {
      if (show && overlay && !this.readonly) {
        if (this.selected) {
          this.showOverlayImage(`data:image/png;base64,${overlay.base64Image}`);
        } else {
          this.showCircleProgress(overlay);
        }
      } else {
        this.hideTaskProgress();
      }
    }));
  }

  private onRoutePointDrop(): void {
    this.subscriptions$.add(this.areasService.routePointDropped
      .pipe(filter(({ areaId }) => areaId === this.id)).subscribe(data => {
        if (!data.hide) {
          this.showPointRotationControl(this.activePoint);
        } else {
          this.removeRotationControl(this.activePoint);
        }
      }));
  }

  private hideTaskProgress(): void {
    this.hideOverlayImage();
    this.removeCircleProgress();
    this.showOriginPoint();
  }

  private removeCircleProgress(): void {
    this.showOriginPoint();
    this.circleProgress?.destroy();
    this.circleProgress = null;
  }

  showOriginPoint(): void {
    this.originPoint?.circle?.style('opacity', '1');
  }

  hideOriginPoint(): void {
    this.originPoint?.circle?.style('opacity', '0');
  }

  get defaultRotation() {
    return { w: 0, x: 0, y: 0, z: 0 };
  }

  public destroy(): void {
    this.group.remove();

    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {
    }
    if (this.activePointSubscription) {
      this.activePointSubscription.unsubscribe();
    }
    this.hideOverlayImage();
    this.removeCircleProgress();
  }
}
