import { ModalService } from '@aitheon/core-client';
import { AreasService } from '../services/areas.service';
import { Coordinates } from '../shared/interfaces/coordinates.interface';
import { InfrastructureMapService } from '../services/infrastructure-map.service';
import { StationsService } from '../services/stations.service';
import { Tooltip } from '../shared/tooltip';
import { Shape } from './shape';
import { getAreaBoundingRect } from '../utils/get-area-bounding-rect';
import { getCenterCoordinatesFromPoints } from '../utils/get-center';
import { uuidv4 } from '../utils/uuidv4';
import { Text } from '../shared/text';
import { Observable, of, Subscription } from 'rxjs';
import { ShapeRouteType } from '../shared/enums/area-route-type.enum';
import { RoutePointAction } from '../shared/enums/route-point-action.enum';

import * as d3 from 'd3';
import { bool } from 'aws-sdk/clients/signer';

interface Point {
  dockGroup?: any;
  circle?: any;
  fromLine?: any;
  toLine?: any;
  routeType: any;
  id: string;
}
export class Station extends Shape {
  private coordinates: Coordinates = {x: 0, y: 0};
  private highlighted: boolean;
  private stationBorder: any;
  private intersects: boolean;
  private entryPoints: Point[] = [];
  private exitPoints: Point[] = [];
  public type: 'CHARGING_DOCK' | 'CHARGING_TRACK' | 'CHARGING' | 'WORK';
  private size: {
    width: number,
    height: number,
  } = {
    width: 64,
    height: 64,
  };
  private rotationSubscriptions$ = new Subscription();
  activePoint: Point;
  activePointType: ShapeRouteType;
  activePointSubscription: Subscription;
  ncCommands: {
    [key: string]: string[],
  } = {};
  isStationMoveable: boolean = false;
  rotationTooltip: any;
  stationRotationDeg = 0;
  keyUpListener: any;
  isShapeInputFocused: boolean;
  isDegreeInputFocused: boolean;

  get station(): any {
    return this.group.select(`[data-id="${this.id}"]`);
  }

  constructor(
    view: any,
    infrastructureMapService: InfrastructureMapService,
    private stationsService: StationsService,
    private areasService: AreasService,
    private modalService: ModalService,
    stationDb?: any,
    private isAdded?: boolean,
  ) {
    super(view, stationDb, infrastructureMapService);
    this.saved = !isAdded && !!stationDb;
    this.createStation();
  }

  createStation(): void {
    this.id = this.dbData ? this.dbData._id : uuidv4();

    this.infrastructureMapService.modeSetted.subscribe(mode => {
      switch (mode) {
        case 'CHARGING_STATION_DOCK':
        this.type = 'CHARGING_DOCK';
        break

        case 'CHARGING_STATION_TRACK':
        this.type = 'CHARGING_TRACK'
        break

        default:
        if (this.dbData) {
          this.type =  this.dbData?.type;
        }
        break
      }
    })
    this.group = this.view.append('g');

    if (this.saved && (this.type !== 'CHARGING' && this.type !== 'CHARGING_DOCK' && this.type !== 'CHARGING_TRACK')) {
      this.createBorder();
    }

    this.group.append('svg:image')
              .style('cursor', 'pointer')
              .attr('data-id', this.id)
              .attr('x', - this.size.width)
              .attr('y', - this.size.height)
              .attr('width', this.size.width)
              .attr('height', this.size.height);

    if (this.type !== 'WORK') {
      this.addRotationArrows();
    }

    if (this.saved) {
      const boundingRect = getAreaBoundingRect(this.dbData.shape.polygonPoints);
      const center = {
        x: boundingRect.left + boundingRect.width / 2,
        y: boundingRect.top + boundingRect.height / 2
      };
      const rotationDelta = 360 - this.dbData.shape.rotation;

      this.coordinates = this.rotatePoint(this.dbData.shape.polygonPoints[0], center, rotationDelta)

      this.stationRotationDeg = this.dbData?.shape?.rotation || 0;
      this.setRotationArrowsCoords(this.coordinates);

      this.setCoords();

      if (this.dbData?.type === 'WORK') {
        this.setStationImage();
      } else {
        this.removeHighlight();
        this.createRoutes();
        this.hideControls();
        this.rotateGroup(this.stationRotationDeg, true);
      }

      this.addName();
      if (this.type === 'WORK') {
        this.textValue.setCoordinates({ x: this.dbData.shape.polygonPoints[0].x,
                                        y: this.dbData.shape.polygonPoints[0].y,
                                        width: boundingRect.width,
                                        height: boundingRect.height})
      }
    } else {
      if (this.dbData?.type === 'WORK') {
        this.setStationImage();
      } else {
        this.highlight();
        this.showRotationArrows();
        this.addRoutePoint(ShapeRouteType.ENTRY);
        this.addRoutePoint(ShapeRouteType.EXIT);
      }
      this.infrastructureMapService.setActiveShape(this.id);
    }

    this.readonly = this.infrastructureMapService.isReadonly();

    if (!this.readonly) {
      this.setListeners();
    }
  }

  private createRoutes(): void {
    if (this.dbData.interaction) {
      const { routes } = this.dbData.interaction;
      for (const route of routes) {
        const { type, points } = route;
        for (const point of points) {
          this.ncCommands[point._id] = point.ncCommands;
          this.addRoutePoint(type as any, point.pose, point._id);
        }
      }
    }
  }

  createBorder(): void {
    this.stationBorder = this.group.append('polygon')
                                    .data([this.dbData?.shape?.polygonPoints || this.points])
                                    .attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '))
                                    .attr('stroke', 'transparent')
                                    .attr('stroke-width', 1)
                                    .attr('fill', 'transparent')
                                    .attr('stroke-linejoin', 'round')
                                    .attr('stroke-width', '2px')
                                    .attr('rx', '2px')
                                    .attr('ry', '2px');
  }

  setStationImage(): void {
    this.subscriptions$.add(this.loadStationImage().subscribe((image) => {
      if (!image) {
        this.station.attr('xlink:href', 'assets/icons-new/work-station-icon.svg')
                    .attr('width', 64)
                    .attr('height', 64);
        this.createBorder();
        this.station.raise();
        return;
      }
      
      const stationScale = this.dbData?.pixelScale;
      const floorScale = this.infrastructureMapService.floor?.pixelScale;
      if (stationScale && floorScale) {
        const relativeScale = stationScale / floorScale;
        this.size.height = image.height * relativeScale;
        this.size.width = image.width * relativeScale;
        this.station.attr('xlink:href', this.dbData?.layoutImage.signedUrl ? this.dbData?.layoutImage.signedUrl : 'assets/icons-new/work-station-icon.svg')
                    .attr('width', this.size.width)
                    .attr('height', this.size.height);
        this.createBorder();
        this.station.raise();
      }
    }));
  }

  loadStationImage(): Observable<any> {
    if (this.dbData?.layoutImage?.signedUrl) {
      return new Observable(subscriber => {
        const background = new Image();
        background.onload = (data) => {
          const image = data.target as any;
          subscriber.next(image);
        };
        background.src = this.dbData?.layoutImage?.signedUrl;
      });
    }
    return of(null);
  }

  setListeners(): void {
    this.onRoutePointAction();
    this.onClick();
    this.onDrag();
    this.onHover();
    this.onMapClick();
    this.onShapeFormChange();
    this.listenToOptionsDropdownClose();
    this.onContextMenu();
  }

  addName(): void {
    if (!this.textValue) {
      const name = this.dbData ? this.dbData.name : '';
      this.textValue = new Text(this.view, name, {...this.coordinates, width: this.size.width, height: this.size.height }, 'STATION');

      if (this.dbData?.hideName) {
        this.hideShapeName();
      }
    }
  }

  onHover(): void {
    this.group.on('mouseenter', () => {
      this.textValue?.onTextHover();
      this.hovered = true;
    });
    this.group.on('mouseleave', () => {
      this.textValue?.onTextLeave();
      this.hovered = false;
    });
  }

  onMapClick(): void {
    this.subscriptions$.add(this.infrastructureMapService.mapClicked.subscribe(() => {
      if (this.saved && !this.editing && !this.hovered && this.highlighted) {
        this.removeHighlight();
      }
    }));
  }

  onShapeFormChange(): void {
    this.subscriptions$.add(this.infrastructureMapService.areaFormUpdated.subscribe(({ areaId, value }) => {
      if (areaId === this.id) {
        let degree = value.degree;

        if (degree !== this.stationRotationDeg) {
          if (!this.isStationMoveable && (this.entryPoints.length > 1 || this.exitPoints.length > 1)) {
            this.hideRotationArrows();
            this.modalService.openGenericConfirm({
              text: 'Routes with Points will be removed from the charge station. Are you sure that you want to remove it?',
              headlineText: 'Remove routes',
              confirmText: 'Remove',
              creationConfirm: true,
              callback: confirm => {
                if (confirm) {
                  this.removeRoutePoints();
                  this.rotateGroup(degree, true);
                }
              }
            });
          } else {
            this.rotateGroup(degree, true);
          }
        }


        this.textValue?.updateText(value.name);
        this.textValue?.setCoordinates({
          x: this.coordinates.x,
          y: this.coordinates.y,
          width: this.size.width,
          height: this.size.height
        });
      }
    }));
  }

  onClick(): void {
    this.station.on('click', (event: Event) => {
      if (!this.intersects) {
        if (!this.saved) {
          this.stationsService.onStationPlaced(this);
          this.addName();
          if (this.dbData?.type !== 'WORK') {
            this.infrastructureMapService.setHint({ message: 'Push Space to rotate on 90° (focusout shape name & rotation input)' });
          }
          return;
        }
        this.onSelect();
        this.highlight();
      }
    });
  }

  onDrag(): void {
    this.station.call(d3.drag()
      .on('start', () => {
        if (this.editing || !this.saved) {
          if (!this.isStationMoveable && (this.entryPoints.length > 1 || this.exitPoints.length > 1)) {
            this.modalService.openGenericConfirm({
              text: 'Routes with Points will be removed from the charge station. Are you sure that you want to remove it?',
              headlineText: 'Remove routes',
              confirmText: 'Remove',
              creationConfirm: true,
              callback: confirm => {
                if (confirm) {
                  this.removeRoutePoints();
                  this.station.raise();
                  this.view.selectAll('circle').raise();
                  this.view.selectAll('g').raise();
                  this.areasService.hideRoutePointControl();
                }
              }
            });
          }
        } else {

        }
      })
      .on('drag', () => {
        if (this.editing || !this.saved) {

          const { offsetX, offsetY } = this.d3Event.sourceEvent;

          this.moveTo({
            x: offsetX,
            y: offsetY,
          });
        }
      }));
  }f

  public moveTo(coordinates: Coordinates): void {
    if (this.d3Event) {
      const path = Array.from(this.d3Event.sourceEvent ? this.d3Event.sourceEvent.path : this.d3Event.path);
      const isOnMap = path.some(({ id }) => id === this.mapId);
      if (!isOnMap) {
        return;
      }
    }
  
    let deltaX = coordinates.x - this.coordinates.x - this.size.width / 2;
    let deltaY = coordinates.y - this.coordinates.y - this.size.height / 2;

    this.coordinates = {
      x: this.coordinates.x + deltaX,
      y: this.coordinates.y + deltaY,
    };

    if (this.stationBorder) {
      this.stationBorder.data([this.points])
                        .attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '))
    }

    this.setCoords();

    if (this.type === 'CHARGING_TRACK') {
      this.setCoordinatesToTrackControls({x: deltaX, y: deltaY});
    } else if (this.type === 'CHARGING_DOCK') {
        this.setCoordinatesToDockControls({x: deltaX, y: deltaY})
    }

    this.setRotationArrowsCoords(this.coordinates)
    this.textValue?.setCoordinates({x: this.coordinates.x,
                                    y: this.coordinates.y,
                                    width: this.size.width,
                                    height: this.size.height});

    this.checkForIntersection();
  }

  checkForIntersection(): void {
    const intersects = this.infrastructureMapService.checkShapesIntersection(this.points, this.id, ['RESTRICTED', 'STATIONS']);
    if (intersects && !this.intersects) {      
      this.intersects = true;
      this.infrastructureMapService.onShapeIntersectionChange(true, this.id);
      this.intersectionWarning = new Tooltip(this.view, 'Stations should not intersect');
      this.intersectView();
    }

    if (intersects) {
      this.intersectionWarning.setCoordinates({
        x: this.coordinates.x + this.size.width / 2,
        y: this.coordinates.y,
      });
    }

    if (!intersects && this.intersects) {
      this.intersects = false;
      this.infrastructureMapService.onShapeIntersectionChange(false, this.id);
      this.removeHighlight();
      this.intersectionWarning.destroy();
    }
  }

  setCoords(): void {
    this.station.attr('x', this.coordinates.x).attr('y', this.coordinates.y);
  }

  setCoordinatesToTrackControls(coordinates) {
    const [entry] = this.entryPoints;
    const [exit] = this.exitPoints;

    let entryCoordinates = entry?.circle.data()[0];
    let exitCoordinates = exit?.circle.data()[0];

    entryCoordinates.x = entryCoordinates.x + coordinates.x;
    entryCoordinates.y = entryCoordinates.y + coordinates.y;

    exitCoordinates.x = exitCoordinates.x + coordinates.x;
    exitCoordinates.y = exitCoordinates.y + coordinates.y;
    
    entry?.circle.attr('cx', entryCoordinates.x)
                .attr('cy', entryCoordinates.y)
                .raise();

    exit?.circle.attr('cx', exitCoordinates.x)
                .attr('cy', exitCoordinates.y)
                .raise();
  }

  setCoordinatesToDockControls(coordinates: Coordinates) {
    const entry = this.entryPoints[0];
    const exit = this.exitPoints[0];

    let entryCoordinates = entry?.dockGroup.data()[0];
    let exitCoordinates = exit?.dockGroup.data()[0];

    entryCoordinates.x = entryCoordinates.x + coordinates.x;
    entryCoordinates.y = entryCoordinates.y + coordinates.y;

    exitCoordinates.x = exitCoordinates.x + coordinates.x;
    exitCoordinates.y = exitCoordinates.y + coordinates.y;

    entry?.dockGroup.data([entryCoordinates])
                  .attr('transform', `translate(${entryCoordinates.x}, ${entryCoordinates.y}) rotate(${this.stationRotationDeg})`)
                  .raise();

    exit?.dockGroup.data([exitCoordinates])
                  .attr('transform', `translate(${exitCoordinates.x}, ${exitCoordinates.y}) rotate(${this.stationRotationDeg})`)
                  .raise();
  }

  removeRoutePoints() {
    this.entryPoints.forEach((item, i) => i > 0 ? this.removeRoutePoint(item) : '');
    this.exitPoints.forEach((item, i) => i > 0 ? this.removeRoutePoint(item) : '');
    this.entryPoints.length = 1;
    this.exitPoints.length = 1;
    this.isStationMoveable = true;
  }

  public getData(): any {
    return {
      name: this.textValue ? this.textValue.getTextValue() : '',
      type: this.type,
      shape: {
        polygonPoints: this.points,
        rotation: this.stationRotationDeg
      },
      interaction: {
        routes: [
          this.getRoute(ShapeRouteType.ENTRY),
          this.getRoute(ShapeRouteType.EXIT),
        ],
      }
    };
  }

  getRoute(routeType: ShapeRouteType): any {
    return {
      type: routeType,
      points: (routeType === ShapeRouteType.ENTRY ? this.entryPoints : this.exitPoints).map(point => {
        let coordinates;
        if (point.dockGroup) {
          coordinates = point.dockGroup.data()[0];
        } else {
          coordinates = point.circle.data()[0];
        }

        return {
          usePreviousRotation: true,
          ncCommands: this.ncCommands[point.id] || [],
          pose: {
            translation: this.getPointCoordinates(point),
          }
        }
      }),
    };
  }

  public get points(): Coordinates[] {
    const { x = 0, y = 0 } = this.coordinates;
    const roundX = Math.round(x);
    const roundY = Math.round(y);
    const origin = {x: roundX + this.size.width / 2, y: roundY + this.size.height / 2};

    let points = [
      { x: roundX, y: roundY },
      { x: roundX + this.size.width, y: roundY },
      { x: roundX + this.size.width, y: roundY + this.size.height },
      { x: roundX, y: roundY + this.size.height }
    ].map(item => {
      return this.rotatePoint(item, origin, this.stationRotationDeg)
    });

    return points;
  }

  public startEdit(): void {
    this.infrastructureMapService.makeShapesReadonly(this.id);
    this.readonly = false;
    this.editing = true;
    this.highlight();
    
    if (this.type !== 'WORK') {
      this.infrastructureMapService.setHint({ message: 'Push Space to rotate on 90° (focusout shape name & rotation input)' });
      this.showRotationArrows();
    }
  }

  rotateGroup(degree?: any, formMapService?: boolean) {
    const previousDegree = this.stationRotationDeg;
    if (degree && formMapService) {
      this.stationRotationDeg = degree
    } else if (!degree && formMapService) {
      this.stationRotationDeg = 0;
    }  else {
      this.stationRotationDeg = this.stationRotationDeg + 90;
      if (this.stationRotationDeg >= 360) {
        this.stationRotationDeg = 0;
      }
    }

    this.group.style('transform', `rotate(${this.stationRotationDeg}deg)`)
                .style('transform-box', 'fill-box')
                .style('transform-origin', 'center');

    const rotationDelta = this.stationRotationDeg - previousDegree;
    this.rotatePoints(rotationDelta, [this.entryPoints[0]]);
    this.rotatePoints(rotationDelta, [this.exitPoints[0]]);
  }

  rotatePoints(rotationDelta: number, points: Point[]): void {
    const origin = this.origin;
    points.forEach(point => {
      const pointCoordinates = this.getPointCoordinates(point);
      const newPointCoordinates = this.rotatePoint(pointCoordinates, origin, rotationDelta);
      this.updatePointPosition(point, newPointCoordinates);
    });
  }

  rotatePoint(point: Coordinates, origin: Coordinates, angle: number) {
    const angleRad = angle * Math.PI / 180.0;
    return {
      x: Math.cos(angleRad) * (point.x - origin.x) - Math.sin(angleRad) * (point.y - origin.y) + origin.x,
      y: Math.sin(angleRad) * (point.x - origin.x) + Math.cos(angleRad) * (point.y - origin.y) + origin.y
    };
  };

  updatePointPosition(point: Point, coordinates: Coordinates): void {
    if (point.dockGroup) {
      point.dockGroup.data([coordinates]).attr('transform', `translate(${coordinates.x}, ${coordinates.y}) rotate(${this.stationRotationDeg})`).raise();
    } else {
      point.circle.data([coordinates]).attr('cx', coordinates.x).attr('cy', coordinates.y);
    }
    if (point.fromLine) {
      point.fromLine?.attr('x2', coordinates.x).attr('y2', coordinates.y);
    }
    if (point.toLine) {
      point.toLine?.attr('x1', coordinates.x).attr('y1', coordinates.y);
    }
  }

  get origin(): Coordinates {
    return {
      x: this.coordinates.x + this.size.width / 2,
      y: this.coordinates.y + this.size.height / 2
    };
  }

  public dismissEdit(): void {
    this.infrastructureMapService.setHint();
    const center = getCenterCoordinatesFromPoints(this.dbData?.shape?.polygonPoints);
    this.moveTo({x: center.x, y: center.y});
    
    if (this.type !== 'WORK') {
      this.rotateGroup(this.dbData?.shape?.rotation, true);
      this.hideRotationArrows();
      this.entryPoints.forEach(item => this.removeRoutePoint(item));
      this.exitPoints.forEach(item => this.removeRoutePoint(item));
      this.entryPoints = [];
      this.exitPoints = [];
    }

    this.createRoutes();
    this.removeHighlight();
    this.isStationMoveable = false;
    this.editing = false;
    this.intersects = false;
    this.rotationSubscriptions$.unsubscribe();
  }

  transparentize(): void {
    this.group.style('opacity', 0.5);
  }

  visible(): void {
    this.group.style('opacity', 1);
  }

  highlight(): void {
    if (!this.readonly) {
      this.highlighted = true;
      this.showControls();

      if (this.type !== 'WORK') {
        this.station.attr('xlink:href', `assets/img/infrastructure-map/charging-station-active.svg`);
        this.onActive();
      } else {
        this.stationBorder.attr('stroke', '#dcbc65');
      }
    }
  }

  onSelect() {
    if (!this.readonly) {
      this.stationsService.onStationSelected(this.id);
    }
  }

  removeHighlight(): void {
    this.highlighted = false;
    if (this.type !== 'WORK') {
      this.station.attr('xlink:href', `assets/img/infrastructure-map/charging-station.svg`);
    } else {
      this.stationBorder?.attr('stroke', 'transparent');
    }

    if (this.type !==  'WORK') {
      this.hideControls();
    }
  }

  hideControls() {
    this.entryPoints.forEach((item, i) => {
      if (i > 0) {
        item.fromLine.style('display', 'none');
        item.circle.style('visibility', 'hidden');
      }
    })

    this.exitPoints.forEach((item, i) => {
      if (i > 0) {
        item.fromLine.style('display', 'none');
        item.circle.style('visibility', 'hidden');
      }
    })
  };

  hideDockControls() {
    this.entryPoints.forEach(item => item.dockGroup?.style('display', 'none'));
    this.exitPoints.forEach(item => item.dockGroup?.style('display', 'none'));
  }

  showControls() {
    if (this.entryPoints.length > 1) {
      this.entryPoints.forEach(item => {
        item.circle?.style('visibility', 'visible')

        if (item.toLine || item.fromLine) {
          item.toLine?.style('display', 'block');
        }
      })
    };

    if (this.exitPoints.length > 1) {
      this.exitPoints.forEach(item => {
        item.circle?.style('visibility', 'visible')

        if (item.toLine || item.fromLine) {
          item.toLine?.style('display', 'block');
        }
      })
    }
  }

  public onSetReadOnly(id: any): void {
    const entry = this.entryPoints[0];
    const exit = this.exitPoints[0];

    entry?.circle?.style('visibility', 'hidden');
    exit?.circle?.style('visibility', 'hidden');

    entry?.dockGroup?.style('visibility', 'hidden');
    exit?.dockGroup?.style('visibility', 'hidden');
  }

  public onActive() {
    const entry = this.entryPoints[0];
    const exit = this.exitPoints[0];

    entry?.circle?.style('visibility', 'visible').raise();
    exit?.circle?.style('visibility', 'visible').raise();

    entry?.dockGroup?.style('visibility', 'visible').raise();
    exit?.dockGroup?.style('visibility', 'visible').raise();

  }

  intersectView(): void {
    if (this.type !== 'WORK') {
      this.station.attr('xlink:href', `assets/img/infrastructure-map/charging-station-red.svg`);
    } else {
      this.stationBorder.attr('stroke', '#E96058');
    }
  }

  public update(stationDb: any): void {
    this.dbData = stationDb;

    this.station.attr('data-id', stationDb._id);
    this.id = stationDb._id;

    if (!this.saved) {
      this.createBorder();
      this.textValue.hideShapeName();
    }

    this.saved = true;
    this.editing = false;
    this.isStationMoveable = false;
    this.removeHighlight();
    
    if (this.type !== 'WORK') {
      this.areasService.hideRoutePointControl();
      this.infrastructureMapService.setHint();
      this.hideRotationArrows(); 
    } else {
      let coords = this.dbData.shape.polygonPoints[0];
      this.textValue?.setCoordinates({
        x: coords.x,
        y: coords.y,
        width: this.size.width,
        height: this.size.height,
      });
    }

    // document.removeEventListener('keyup', this.keyUpListener, false);
    this.rotationSubscriptions$.unsubscribe();
  }

  // ___________________________________________________________


  private addRoutePoint(type: ShapeRouteType, pose?: any, pointId?: string): void {
    const { translation } = pose || {} as any;
    const areaBoundingRect = getAreaBoundingRect(this.points);
    const id = pointId ? pointId : uuidv4();
    const pointCoordinates = translation || {} as Coordinates;
    let pointsArray = type === ShapeRouteType.ENTRY ? this.entryPoints : this.exitPoints;
    let createFromLine = pointsArray.length > 0;
    let pointObject: Point;
    let dockGroup: any;

    if (!translation && this.type === 'CHARGING_TRACK') {
      pointCoordinates.y = areaBoundingRect.top + (areaBoundingRect.height / 2);
      pointCoordinates.x = type === ShapeRouteType.ENTRY ? areaBoundingRect.left : areaBoundingRect.right;
    } else if (!translation && this.type === 'CHARGING_DOCK') {
      pointCoordinates.y = areaBoundingRect.top + 64;
      pointCoordinates.x = type === ShapeRouteType.ENTRY ? areaBoundingRect.left + 32 : areaBoundingRect.right - 32;
    }

    if (this.type === 'CHARGING_DOCK' && pointsArray.length === 0) {
      dockGroup = this.view.append('g')
                            .attr('data-id', id)
                            .data([pointCoordinates])
                            .attr('class', type === ShapeRouteType.ENTRY ? 'dock-entry-circle' : 'dock-exit-circle')
                            .attr('transform', `translate(${pointCoordinates.x}, ${pointCoordinates.y}) rotate(${this.stationRotationDeg})`)
                            .raise();

      dockGroup.append('path')
                .attr('d', this.generateSemiCircle(type === ShapeRouteType.ENTRY ? Math.PI : 0))
                .attr('r', 8)
                .style('fill', type === ShapeRouteType.ENTRY ? '#67B231' : '#E96058')
                .style('cursor', 'pointer')
                .raise();

      pointObject = {
        dockGroup,
        id,
        routeType: type,
      };
    } else {
      this.view.append('circle')
                .attr('class', type === ShapeRouteType.ENTRY ? 'track-entry-circle' : 'track-exit-circle')
                .attr('data-id', id)
                .attr('r', 8)
                .style('fill', type === ShapeRouteType.ENTRY ? '#67B231' : '#E96058')
                .style('cursor', 'pointer');

      const circle = this.view.select(`[data-id="${id}"`);

      circle.attr('cx', pointCoordinates.x)
            .attr('cy', pointCoordinates.y)
            .data([pointCoordinates]);

      pointObject = {
        fromLine: createFromLine ? this.createRouteLine(pointCoordinates, type) : '',
        circle,
        id,
        routeType: type,
      };
    }

    pointsArray.push(pointObject);

    this.listenToRoutePointClick(pointObject);

    if (!pointObject.circle) {
      return
    }
    this.onRoutePointDrag(pointObject);
  }

  generateSemiCircle(startAngle) {
    return d3.arc()
              .outerRadius(8)
              .innerRadius(0)
              .startAngle(startAngle)
              .endAngle(startAngle + Math.PI);
  }

  onRoutePointDrag(point: Point): void {
    point.circle.on('mouseover', () => {
      point.circle.raise();
    });

    if (!(point.routeType === ShapeRouteType.ENTRY && this.entryPoints?.length === 1) &&
        !(point.routeType === ShapeRouteType.EXIT && this.exitPoints?.length === 1)) {
      point.circle.call(d3.drag()
                  .on('drag', () => this.onPointDrag(point)));
    }
  }

  onPointDrag(point: Point): void {
    if (this.editing && !this.readonly) {
      const { offsetX, offsetY } = this.d3Event.sourceEvent;
      point.circle?.attr('cx', offsetX).attr('cy', offsetY);
      point.fromLine?.attr('x2', offsetX).attr('y2', offsetY);
      if (point.toLine) {
        point.toLine?.attr('x1', offsetX).attr('y1', offsetY);
      }
    }
  }

  listenToRoutePointClick(routePoint: Point): void {
    const shape = routePoint.circle ? routePoint.circle : routePoint.dockGroup;

    shape.on('click', () => {
      const coordinates = this.getPointCoordinates(routePoint);
      const { point, isLast, pointIndex, type } = this.getRoutePointById(routePoint.id);
      this.d3Event.stopPropagation();
      this.d3Event.preventDefault();
      this.activePoint = point;
      this.activePointType = type;
      this.infrastructureMapService.setActiveShape(this.id);

      this.areasService.onRoutePointSelect({
        coordinates,
        type: this.activePoint.dockGroup ? ShapeRouteType.DOCK : this.activePointType,
        pointId: routePoint.id,
        areaId: this.id,
        isLast,
        pointIndex,
        restrictRemoval: routePoint.routeType === ShapeRouteType.ENTRY ? this.entryPoints.length === 1 : this.exitPoints.length === 1,
        isEdit: this.editing && !this.readonly,
        chargeStation: true,
        chargeStationType: this.type
      });

      this.listenToActivePointMove();
    });
  }

  private listenToActivePointMove(): void {
    this.activePointSubscription = this.areasService.activePointMoved.subscribe(({ coordinates, shapeId }) => {
      if (this.activePoint && shapeId === this.id) {
        if (this.activePoint.circle) {
          this.activePoint.circle.data([coordinates])
                                  .attr('cx', coordinates.x)
                                  .attr('cy', coordinates.y);

          this.activePoint.fromLine?.attr('x2', coordinates.x).attr('y2', coordinates.y);
          this.activePoint.toLine?.attr('x1', coordinates.x).attr('y1', coordinates.y);
        } else {
          this.activePoint.dockGroup.data([coordinates]).attr('transform', `translate(${coordinates.x}, ${coordinates.y})` ).raise();
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

  private getPointCoordinates(point: Point): Coordinates {
    if (point?.circle) {
      return {
        x: +point.circle.attr('cx'),
        y: +point.circle.attr('cy')
      }
    }

    const [coordinates] = point?.dockGroup?.data();
    return coordinates;
  }

  createRouteLine(circleCoordinates: Coordinates, type: ShapeRouteType): any {
    let startCoordinates: Coordinates = {
      x: 0,
      y: 0,
    };

    let lastPoint;

    if (type === ShapeRouteType.ENTRY && this.entryPoints.length) {
      lastPoint = this.entryPoints[this.entryPoints.length - 1];
    }
    if (type === ShapeRouteType.EXIT && this.exitPoints.length) {
      lastPoint = this.exitPoints[this.exitPoints.length - 1];
    }

    if (lastPoint && lastPoint.circle) {
      startCoordinates = {
        x: +lastPoint.circle.attr('cx'),
        y: +lastPoint.circle.attr('cy')
      };
    } else {
      [startCoordinates] = lastPoint?.dockGroup?.data();
    }

    const lineColor = type === ShapeRouteType.ENTRY ? '#67B231' : '#E96058';
    const lineId = uuidv4();
    this.view.append('line')
              .attr('data-id', lineId)
              .attr('x1', startCoordinates.x)
              .attr('y1', startCoordinates.y)
              .attr('x2', circleCoordinates.x)
              .attr('y2', circleCoordinates.y)
              .attr('stroke-width', 2)
              .attr('stroke', lineColor);

    const line = this.view.select(`[data-id="${lineId}"`);
    if (lastPoint) {
      lastPoint.toLine = line;
    }
    return line;
  }


  private onRoutePointAction(): void {
    this.subscriptions$.add(this.areasService.routePointActionFired.subscribe(({ action, areaId, type, meta }) => {
      if (type) {
        this.activePointType = type;
      }

      if (this.activePoint && areaId === this.id) {
        const points = this.activePointType === ShapeRouteType.ENTRY ? this.entryPoints : this.exitPoints;
        switch (action) {
          case RoutePointAction.ADD:
            this.addRoutePoint(this.activePointType, { translation: meta.coordinates });
            this.activePoint = points[points.length - 1];
            this.areasService.changeActiveRoutePoint(this.activePoint.id, this.ncCommands[this.activePoint.id]);
            break;
          case RoutePointAction.REMOVE:
            this.removeRoutePoint(this.activePoint)
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
    point?.circle?.remove();
    point?.toLine?.remove();

    if (point?.fromLine) {
      point?.fromLine?.remove()
    }
  }

  addRotationArrows() {
    this.group.append('foreignObject')
              .attr('class', 'arrow-nw')
              .attr('width', '8px')
              .attr('height', '8px')
              .append('xhtml:div')
              .attr('class', 'arrow-rotation arrow-rotation--nw');

    this.group.append('foreignObject')
              .attr('class', 'arrow-ne')
              .attr('width', '8px')
              .attr('height', '8px')
              .append('xhtml:div')
              .attr('class', 'arrow-rotation arrow-rotation--ne');

    this.group.append('foreignObject')
           .attr('class', 'arrow-se')
           .attr('width', '8px')
           .attr('height', '8px')
           .append('xhtml:div')
           .attr('class', 'arrow-rotation arrow-rotation--se');

    this.group.append('foreignObject')
            .attr('class', 'arrow-sw')
            .attr('width', '8px')
            .attr('height', '8px')
            .append('xhtml:div')
            .attr('class', 'arrow-rotation arrow-rotation--sw');

    this.setRotationArrowsCoords(this.coordinates);
  }

  showRotationArrows() {
    this.group.selectAll('.arrow-rotation').style('display', 'block');

    this.setRotationArrowsCoords(this.coordinates)
  }

  hideRotationArrows() {
    this.group.selectAll('.arrow-rotation').style('display', 'none')
  }

  setRotationArrowsCoords(coordinates: Coordinates) {
    this.group.select('.arrow-nw')
              .attr('x', coordinates?.x - 2)
              .attr('y', coordinates?.y - 2);

    this.group.select('.arrow-ne')
              .attr('x', coordinates?.x + this.size.width + 2 - 8)
              .attr('y', coordinates?.y - 2);

    this.group.select('.arrow-se')
              .attr('x', coordinates?.x + this.size.width + 2 - 8)
              .attr('y', coordinates?.y + this.size.height + 2 - 8)

    this.group.select('.arrow-sw')
              .attr('x', coordinates?.x - 2)
              .attr('y', coordinates?.y + this.size.height + 2 - 8)
  }

  // ___________________________________________________________

  get stationCenter() {
    return {x: this.coordinates.x + this.size.height / 2, y: this.coordinates.y + this.size.width / 2 };
  }

  public destroy(): void {
    this.station.remove();
    this.group.remove();
    this.view.selectAll('line').remove();
    this.view.selectAll('circle').remove();
  
    if (this.textValue) {
      this.textValue.hideShapeName();
    }

    if (this.type === 'CHARGING_DOCK') {
      this.hideDockControls();
    }

    if (this.stationBorder) {
      this.stationBorder.remove();
    }

    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {
    }

    if (this.activePointSubscription) {
      this.activePointSubscription.unsubscribe();
    }
  }
}
