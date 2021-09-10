import { ModalService } from '@aitheon/core-client';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as d3 from 'd3';
import { Subscription, Observable } from 'rxjs';
import { ShapeDropdownMenuComponent } from './components/shape-dropdown-menu/shape-dropdown-menu.component';
import { DevicesService } from './services/devices.service';
import { AreasService } from './services/areas.service';
import { StationsService } from './services/stations.service';
import { InfrastructureMapService } from './services/infrastructure-map.service';
import { InfrastructureMapMode, AreaType, ShapeType, DeviceSubtype } from './shared/enums'
import { Station, Waypoint, Device, Area } from './shapes';
import { Shape } from './shapes/shape';
import { Coordinates } from './shared/interfaces/coordinates.interface';
import { Tooltip } from './shared/tooltip';
import { getCenterCoordinatesFromPoints } from './utils/get-center';

import { hexToRGB } from './utils/hexToRgba';
import { uuidv4 } from './utils/uuidv4';
import { BoundingRect } from './shared/interfaces/bounding-rect.interface';

@Component({
  selector: 'ai-infrastructure-map',
  templateUrl: './infrastructure-map.component.html',
  styleUrls: ['./infrastructure-map.component.scss']
})
export class InfrastructureMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer: ElementRef;
  @ViewChild('shapeOptionsDropdown') shapeOptionsDropdown: ShapeDropdownMenuComponent;
  @ViewChild('editor') editor: ElementRef;

  @Input() isProd: boolean;
  @Input() showZoomControls = true;
  @Input() controlsPositionTop: boolean;
  @Input() floor: any;
  @Input() shapes: any[];
  @Input() dashboardView: any[];
  @Input() mapOpacity: number | string;
  @Input() mapContainerStyles: {
    [key: string]: string,
  } = {
    width: '100vw',
    height: '100%',
  };
  @Input() centerOn: string;
  @Input() archivedInfrastructure: boolean;

  @Output() stationAdded: EventEmitter<void> = new EventEmitter<void>();
  @Output() shapeAdded: EventEmitter<{
    type: ShapeType,
    parent?: string,
    shape?: Shape
  }> = new EventEmitter<{ type: ShapeType, shape: Shape }>();
  @Output() shapesRendered: EventEmitter<void> = new EventEmitter<void>();
  @Output() dimensionChanged: EventEmitter<void> = new EventEmitter<void>();

  hintMessage$: Observable<{ message: string }>;
  mapId: string;
  mapModes = InfrastructureMapMode;
  initialized: boolean;
  transformStyles: { [key: string]: string } = {
    transform: 'translate(0, 0) scale(1)',
  };
  subscriptions = new Subscription();
  size: {
    width: number,
    height: number,
  };
  transform: {
    scale: number,
    x: number,
    y: number,
  } = {
    scale: 1,
    x: 0,
    y: 0,
  };
  isDragging: boolean;
  dragStartCoordinates: {
    x: number,
    y: number,
  };
  initTransform: {
    x: number,
    y: number,
  };

  mode: InfrastructureMapMode;
  areaPoints: any[] = [];
  activeShapeId: string;
  activeStation: Station;
  activeDevice: Device;
  addTaskButtonStyles: {
    top: string,
    left: string,
  } = {} as any;
  restrictTranslation: boolean;
  selectedAreaId: string;
  scale: number;
  areaFills = {
    standard: hexToRGB('#dcbc65', 0.2),
    restricted: 'url(#striped-pattern)',
  };
  activeShapeIntersectionWarning: Tooltip;
  view: any;
  isContainerElement: boolean = false;
  isAddTaskButtonToBottom: boolean = false;
  private isAddTaskButtonOpened: boolean = false;
  inCoords: any;

  get activeShape(): any {
    return this.view.select(`[data-id="${this.activeShapeId}"]`);
  }

  get d3Event(): any {
    return d3.event;
  }

  get editorContainerRect(): DOMRect {
    return this.editorContainer.nativeElement.getBoundingClientRect();
  }

  constructor(
    private infrastructureMapService: InfrastructureMapService,
    private stationsService: StationsService,
    private devicesService: DevicesService,
    private areasService: AreasService,
    private modalService: ModalService
  ) {
  }

  ngOnInit(): void {
    this.hintMessage$ = this.infrastructureMapService.hint$;
    this.mapId = this.infrastructureMapService.mapId;
    this.infrastructureMapService.setEnvironment(this.isProd);
    this.infrastructureMapService.registerFloor(this.floor);
    this.listenToMapModeChange();
    this.listenMapTranslateRestriction();
    this.listenToAreaSelect();
    this.listenToStationPlacing();
    this.listenToDevicePlacing();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized) {
      const { floor, shapes } = changes;
      if (floor && floor.currentValue) {
        this.infrastructureMapService.registerFloor(floor.currentValue);
        this.createMap();
      }
      if (shapes && shapes.currentValue) {
        this.addShapesOnMap();
      }
    }

    if (this.editorContainer && this.editorContainer.nativeElement) {
      this.isContainerElement = true;
    }
  }

  ngAfterViewInit(): void {
    this.initD3();

    this.createMap();
    this.onViewMouseMove();
    this.onMouseDown();
    this.onClick();
    this.createStripedPattern();
    this.addTextBackgroundFilter();
    this.onContextMenu();
  }

  listenToMapModeChange(): void {
    this.subscriptions.add(this.infrastructureMapService.modeSetted.subscribe(mode => {
      this.mode = mode;
      if (!this.mode) {
        this.exitEditMode();
        return;
      }
      switch (this.mode) {
        case InfrastructureMapMode.CHARGING_STATION_DOCK:
        case InfrastructureMapMode.CHARGING_STATION_TRACK:
        case InfrastructureMapMode.CHARGING_STATION:
        case InfrastructureMapMode.WORK_STATION:
          this.addStation();
          break;
        case InfrastructureMapMode.ANCHOR:
        case InfrastructureMapMode.CAMERA:
          this.addDevice();
          break;
        default:
          break;
      }
    }));
  }

  listenMapTranslateRestriction(): void {
    this.subscriptions.add(this.infrastructureMapService.mapTranslationRestricted.subscribe(restricted => {
      this.restrictTranslation = restricted;

      if (this.restrictTranslation) {
        this.closeAddTaskButton();
        if (this.shapeOptionsDropdown.isOpened) {
          this.shapeOptionsDropdown.hide();
        }
      }
    }));
  }

  listenToAreaSelect(): void {
    this.subscriptions.add(this.areasService.areaSelected.subscribe(({boundingRect, areaId}) => {
      const area = this.infrastructureMapService.getShapeById(areaId) as Area;

      if (area.type !== AreaType.RESTRICTED && !this.restrictTranslation) {
        if (boundingRect.top < this.editorContainer.nativeElement.getBoundingClientRect().top) {
          return;
        }

        const isFirstClickOnArea = this.selectedAreaId !== areaId;

        if (isFirstClickOnArea || !this.isAddTaskButtonOpened) {
          this.openAddTaskButton(areaId, boundingRect);
        } else {
          this.closeAddTaskButton();
        }
      } else {
        this.closeAddTaskButton();
      }
    }));
  }

  listenToStationPlacing(): void {
    this.subscriptions.add(this.stationsService.stationPlaced.subscribe((station: Station) => {
      this.infrastructureMapService.addShape(station);
      this.infrastructureMapService.setActiveShape(station.id);
      this.mode = null;
      this.shapeAdded.emit({
        type: station.type as any,
        shape: this.activeStation,
      });
    }));
  }

  listenToDevicePlacing(): void {
    this.subscriptions.add(this.devicesService.devicePlaced$.subscribe(() => {
      this.infrastructureMapService.addShape(this.activeDevice);
      this.infrastructureMapService.setActiveShape(this.activeDevice.id);
      this.mode = null;
      this.shapeAdded.emit({
        shape: this.activeDevice as Shape,
        type: ShapeType.DEVICE,
      });
    }));
  }


  initD3(): void {
    this.view = d3.select(`#${this.mapId}`).append('svg')
      .attr('width', 0)
      .attr('height', 0)
      .classed('infrastructure-map', true);
    this.view.append('svg:image')
      .classed('map-background', true)
      .attr('x', 0)
      .attr('y', 0);
    this.initialized = true;
    if (this.shapes && this.shapes.length) {
      this.addShapesOnMap();
    }
  }

  onViewMouseMove(): void {
    this.view.on('mousemove', () => {
      this.infrastructureMapService.onMapMouseMove();
      switch (this.mode) {
        case InfrastructureMapMode.CHARGING_STATION_DOCK:
        case InfrastructureMapMode.CHARGING_STATION_TRACK:
        case InfrastructureMapMode.CHARGING_STATION:
        case InfrastructureMapMode.WORK_STATION:
          const { offsetX, offsetY } = this.d3Event;
          this.activeStation.moveTo({
            x: offsetX,
            y: offsetY,
          });
          break;

        case InfrastructureMapMode.ANCHOR:
        case InfrastructureMapMode.CAMERA:
          this.activeDevice.moveTo({
            x: this.d3Event.offsetX,
            y: this.d3Event.offsetY,
          });
          break;

        case InfrastructureMapMode.RECTANGLE:
        case InfrastructureMapMode.RESTRICTED_RECTANGLE:
          if (this.activeShapeId) {
            this.onUpdateSquare();
          }

          break;
        case InfrastructureMapMode.SHAPE:
        case InfrastructureMapMode.RESTRICTED_SHAPE:
          this.updateActiveAreaPoints();
          break;
        default:
          break;
      }

      this.listenToIntersection();
    });
  }

  listenToIntersection(): void {
    if (this.mode && this.activeShapeIntersectionWarning) {
      if (!this.activeShapeId) {
        const restricted = this.mode === InfrastructureMapMode.RESTRICTED_RECTANGLE || this.mode === InfrastructureMapMode.RESTRICTED_SHAPE;
        const {offsetX, offsetY} = this.d3Event;
        const intersects = this.infrastructureMapService.checkShapesIntersection([{
          x: offsetX,
          y: offsetY
        }], null, restricted ? ['AREAS', 'STATIONS'] : ['AREAS']);
        if (!intersects) {
          this.activeShapeIntersectionWarning.destroy();
          this.activeShapeIntersectionWarning = null;
        }
      }
    }
  }

  createStripedPattern(): void {
    const defs = this.view.append('defs');

    // standard pattern
    defs
      .append('pattern')
      .attr('id', 'striped-pattern')
      .attr('height', 8)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(45)')
      .attr('width', 8)
      .append('rect')
      .attr('width', 2)
      .attr('height', 8)
      .attr('transform', 'translate(0,0)')
      .attr('fill', hexToRGB('#eeeeee', 0.2));

    // highlighted pattern
    defs
      .append('pattern')
      .attr('id', 'striped-pattern-highlighted')
      .attr('height', 8)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(45)')
      .attr('width', 8)
      .append('rect')
      .attr('width', 2)
      .attr('height', 8)
      .attr('transform', 'translate(0,0)')
      .attr('fill', hexToRGB('#eeeeee', 0.4));
  }

  addTextBackgroundFilter(): void {
    const defs = this.view.select('defs');
    const filter = defs.append('filter')
      .attr('x', '0')
      .attr('y', '0')
      .attr('width', '1')
      .attr('height', '1')
      .attr('id', 'solid-bg');
    filter.append('feFlood')
      .attr('flood-color', 'rgba(52,52,52,0.4)');
    filter.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('operator', 'xor');
  }

  createMap(): void {
    if (this.floor && this.floor.uploadedFile) {
      this.setBackground();
    }
  }

  addShapesOnMap(): void {
    this.infrastructureMapService.clearShapes();
    for (const shape of this.shapes) {
      if (shape.subType) {
        this.infrastructureMapService.addShape(new Device(this.view, this.infrastructureMapService, this.devicesService, shape));
      } else {
        switch (shape.type) {
          case ShapeType.CHARGING:
          case ShapeType.CHARGING_DOCK:
          case ShapeType.CHARGING_TRACK:
          case ShapeType.WORK:
            this.infrastructureMapService.addShape(new Station(
              this.view,
              this.infrastructureMapService,
              this.stationsService,
              this.areasService,
              this.modalService,
              shape,
            ));
            break;
            
          case ShapeType.WAYPOINT:
            this.infrastructureMapService.addShape(new Waypoint(
              this.view,
              this.infrastructureMapService,
              shape
            ));
            break;

          case AreaType.RESTRICTED:
          case AreaType.TARGET:
          case AreaType.INITIALIZATION:
            this.infrastructureMapService.addShape(new Area(this.view, this.infrastructureMapService, shape, this.areasService));
        }
      }
    }

    if (this.centerOn) {
      this.centerOnShape();
    }
    this.shapesRendered.emit();
  }

  centerOnShape(id?: string): void {
    const shapeId = id || this.centerOn;
    if (shapeId) {
      const shape = this.infrastructureMapService.getShapeById(shapeId) as Waypoint;
      if (shape && this.size) {
        let { coordinates } = shape;
        if (!coordinates) {
          coordinates = getCenterCoordinatesFromPoints((shape as unknown as Area).points);
        }
        this.transform.scale = 1;
        this.transform.x = this.size.width / 2 - coordinates.x;
        this.transform.y = this.size.height / 2 - coordinates.y;
        this.setTransformStyles();
      }
    }
  }

  setBackground(): void {
    const background = new Image();
    background.onload = async (data) => {
      const image = data.target as any;
      this.size = {
        width: image.width,
        height: image.height,
      };

      this.view.attr('width', this.size.width).attr('height', this.size.height);
      this.view.select('.map-background')
        .attr('width', this.size.width)
        .attr('height', this.size.height)
        .attr('xlink:href', this.floor.uploadedFile.signedUrl);

      if (this.mapOpacity) {
        this.view.select('.map-background')
          .style('opacity', this.mapOpacity);
      }

      this.zoomToFit();
      this.setTransformStyles();

      if (this.centerOn) {
        this.centerOnShape();
      }
    };
    background.src = this.floor.uploadedFile.signedUrl;
  }

  zoomToFit(): void {
    if (this.size.width > this.editorContainer.nativeElement.offsetWidth) {
      this.transform.scale = this.editorContainer.nativeElement.offsetWidth / this.size.width;
    }
    if (this.size.height > this.editorContainer.nativeElement.offsetHeight) {
      this.transform.scale = this.editorContainer.nativeElement.offsetHeight / this.size.height;
    }

    this.calculateScale();
  }

  /** LISTENERS SECTION */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {

    if (this.isDragging && !this.restrictTranslation) {
      if (
        (event.target as any).classList.contains('route-point-control__center') ||
        (event.target as any).classList.contains('device-image')
      ) {
        return;
      }

      this.onEditorTranslate(event);
    }
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    this.onEditorDrop();
  }

  @HostListener('document:dragend')
  onDocumentDragEnd(): void {
    this.onEditorDrop();
  }

  onMouseDown(): void {
    this.view.on('mousedown', () => {
      if (this.mode) {
        this.infrastructureMapService.setStartDrawing(true);
      }
      switch (this.mode) {
        case InfrastructureMapMode.SHAPE:
        case InfrastructureMapMode.RESTRICTED_SHAPE:
          this.updateArea(this.d3Event);
          break;
        case InfrastructureMapMode.RECTANGLE:
        case InfrastructureMapMode.RESTRICTED_RECTANGLE:
          this.processSquare(this.d3Event);
          break;
        case InfrastructureMapMode.WAYPOINT:
          this.addWaypoint();
          break;
        default:
          break;
      }
    });
  }

  onClick(): void {
    this.view.on('click', () => {
      this.infrastructureMapService.onMapClick();

      if (this.d3Event.target.classList.contains('map-background')) {
        this.closeAddTaskButton();
      }
    });
  }

  onContextMenu(): void {
    this.view.on('contextmenu', () => {
      this.d3Event?.stopPropagation();
      this.d3Event?.preventDefault();
      this.closeAddTaskButton();
    });
  }

  onScroll(event: WheelEvent): void {
    this.stopEvent(event);

    if (!this.inCoords) {
      const rect = this.editor.nativeElement.getBoundingClientRect();
      this.inCoords = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }

    const delta = (event as any).wheelDelta / 120
    const nextScale = this.transform.scale + delta * 0.1;
    const ratio = 1 - nextScale / this.transform.scale;

    this.dimensionChanged.emit();

    if (this.selectedAreaId) {
      this.closeAddTaskButton();
      if (this.shapeOptionsDropdown.isOpened) {
        this.shapeOptionsDropdown.hide();
      }
    }

    this.transform.scale = nextScale;

    if (this.transform.scale >= 0.4 && this.transform.scale < 2) {
      this.transform.x += (event.clientX - (this.inCoords.width / 2) - this.inCoords.x - this.transform.x) * ratio;
      this.transform.y += (event.clientY - (this.inCoords.height / 2) - this.inCoords.y - this.transform.y) * ratio;
    }

    this.calculateScale();
    this.setTransformStyles();
  }

  zoomByButtons(e: Event, type: string) {
    this.stopEvent(e);

    if (
      this.transform.scale < 0.4 && type === 'ZOOM_OUT' ||
      this.transform.scale > 2 && type === 'ZOOM_IN' ||
      this.restrictTranslation) {
      return;
    }

    if (this.selectedAreaId) {
      this.closeAddTaskButton();
    }

    if (type === 'ZOOM_IN') {
      this.transform.scale += 0.05;
    } else if (type === 'ZOOM_OUT') {
      this.transform.scale -= 0.05;
    }

    this.calculateScale();
    this.setTransformStyles();
  }

  calculateScale() {
    if (this.transform.scale > 2) {
      this.transform.scale = 2;
    }

    if (this.transform.scale < 0.4) {
      this.transform.scale = 0.4;
    }

    const scaleValue = Math.round(this.transform.scale / 0.05) * 0.05;
    this.scale = scaleValue * 100;
  }

  fitMap() {
    this.transform = {
      ...this.transform,
      x: 0,
      y: 0
    };

    this.zoomToFit();
    this.setTransformStyles();
  }

  public hideTaskButton(): void {
    this.closeAddTaskButton();
  }

  onEditorDrag(event: Event): void {
    const target = (event.target as any);
    if (target && target.hasAttribute('cpposition')) {
      return;
    }
    this.isDragging = true;
  }

  onEditorDrop(): void {
    this.isDragging = false;
    this.dragStartCoordinates = null;
    this.initTransform = null;
  }

  onEditorTranslate(event: MouseEvent): void {
    if (!this.dragStartCoordinates) {
      this.dragStartCoordinates = {
        x: event.clientX,
        y: event.clientY,
      };
      this.initTransform = {
        x: this.transform.x,
        y: this.transform.y,
      };
      return;
    }
    const deltaX = event.clientX - this.dragStartCoordinates.x;
    const deltaY = event.clientY - this.dragStartCoordinates.y;

    const translated = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;
    if (translated) {
      this.dimensionChanged.emit();
      if (this.selectedAreaId) {
        if (this.selectedAreaId) {
          this.closeAddTaskButton();

          if (this.shapeOptionsDropdown.isOpened) {
            this.shapeOptionsDropdown.hide();
          }
        }
      }
    }

    this.transform.x = this.initTransform.x + deltaX;
    this.transform.y = this.initTransform.y + deltaY;
    this.setTransformStyles();
  }

  /** LISTENERS SECTION END */

  setTransformStyles(): void {
    this.infrastructureMapService.setMapScale(this.transform.scale);
    this.transformStyles.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
  }

  /** STATION SECTION */
  addStation(): void {
    if (this.activeStation && !this.activeStation?.saved) {
      this.activeStation.destroy();
      this.activeStation = null;
    }
    let stationDb;
    if (this.mode === InfrastructureMapMode.WORK_STATION) {
      stationDb = this.stationsService.stationToAdd;
    }
    this.activeStation = new Station(
      this.view,
      this.infrastructureMapService,
      this.stationsService,
      this.areasService,
      this.modalService,
      stationDb,
      this.mode === InfrastructureMapMode.WORK_STATION,
    );
    this.infrastructureMapService.setActiveShape(this.activeStation.id);
  }

  /** STATION SECTION END */

  /** DEVICE SECTION */
  addDevice(): void {
    this.activeDevice = new Device(this.view, this.infrastructureMapService, this.devicesService, {
      subType: this.mode === InfrastructureMapMode.CAMERA ? DeviceSubtype.CAMERA : DeviceSubtype.ANCHOR,
    });
    this.infrastructureMapService.setActiveShape(this.activeDevice.id);
  }

  /** DEVICE SECTION END */

  /** AREA SECTION */
  updateArea(event: any): void {
    if (!this.activeShapeId && event.target && event.target.nodeName === 'polygon') {
      this.showIntersectionWarning();
      return;
    }

    if (this.areaPoints.length) {
      const firstPointData = this.areaPoints[0].data()[0] as Coordinates;
      if (Math.abs(event.offsetX - firstPointData.x) <= 10 && Math.abs(event.offsetY - firstPointData.y) <= 10) {
        this.generateArea();
        return;
      }
    }

    this.addPoint(event);
  }

  addPoint(event: any): void {
    if (this.activeShapeIntersectionWarning) {
      return;
    }

    const coordinates = {
      x: event.offsetX,
      y: event.offsetY,
    } as Coordinates;

    const circleId = uuidv4();

    this.view.append('circle')
      .data([coordinates])
      .attr('r', this.areaPoints.length === 0 ? 8 : 5)
      .attr('fill', this.areaPoints.length === 0
        ? (this.mode === InfrastructureMapMode.SHAPE ? '#dcbc65' : '#eeeeee')
        : '#454545')
      .attr('stroke', '#454545')
      .attr('stroke-width', 0.5)
      .attr('cx', coordinates.x)
      .attr('cy', coordinates.y)
      .attr('data-id', circleId)
      .raise();

    const circle = this.view.select(`[data-id="${circleId}"]`);

    this.areaPoints.push(circle);

    if (this.areaPoints.length === 1) {
      circle.raise();

      this.activeShapeId = uuidv4();
      this.view.append('polygon')
        .data([new Array(2).fill(coordinates)])
        .attr('data-id', this.activeShapeId)
        .attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '))
        .attr('stroke', this.mode === InfrastructureMapMode.SHAPE ? '#dcbc65' : '#eeeeee')
        .attr('fill', this.mode === InfrastructureMapMode.SHAPE ? this.areaFills.standard : this.areaFills.restricted)
        .attr('stroke-width', 1);
    } else {
      const poly = this.activeShape.data()[0];
      poly.push(coordinates);
      this.activeShape
        .data([poly])
        .attr('stroke-width', 2);
    }
  }

  updateActiveAreaPoints(): void {
    if (this.activeShapeId) {
      const {offsetX, offsetY} = this.d3Event;
      const poly = this.activeShape.data()[0];
      poly.splice(-1, 1, {x: offsetX, y: offsetY});
      this.activeShape
        .data([poly])
        .attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '));

      if (this.isShapeIntersects(poly)) {
        this.showIntersectionWarning();
      } else if (this.activeShapeIntersectionWarning) {
        this.hideIntersectionWarning();
      }
    }
  }

  generateArea(): void {
    const [points] = this.activeShape.data();
    points.splice(-1, 1);
    this.activeShape.remove();
    const areaObject = {
      type: this.mode === InfrastructureMapMode.RESTRICTED_SHAPE ? 'RESTRICTED' : 'TARGET',
      shape: {
        polygonPoints: points,
      }
    };

    this.infrastructureMapService.addShape(new Area(this.view, this.infrastructureMapService, areaObject, this.areasService));
    this.exitEditMode();
  }

  /** AREA SECTION END */

  /* SQUARE SECTION */
  processSquare(event: any): void {
    if (!this.activeShapeId) {
      if (event.target && event.target.nodeName === 'polygon') {
        this.showIntersectionWarning();
        return;
      }
      this.createSquare(event);
      return;
    }
    this.saveSquare();
  }

  createSquare(event: any): void {
    const { offsetX, offsetY } = event;
    const poly = new Array(4).fill({x: offsetX, y: offsetY});
    this.activeShapeId = uuidv4();
    this.view.append('polygon')
      .data([poly])
      .attr('data-id', this.activeShapeId)
      .attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '))
      .attr('fill', this.mode === InfrastructureMapMode.RECTANGLE ? this.areaFills.standard : this.areaFills.restricted)
      .attr('stroke', this.mode === InfrastructureMapMode.RECTANGLE ? '#dcbc65' : '#eeeeee')
      .attr('stroke-width', 2);
  }

  onUpdateSquare(): void {
    const { offsetX, offsetY } = this.d3Event;
    const [poly] = this.activeShape.data();
    const initCoords = poly[0];
    const updatedPoly = [
      initCoords,
      { x: initCoords.x, y: offsetY },
      { x: offsetX, y: offsetY },
      { x: offsetX, y: initCoords.y },
    ];
    this.activeShape.data([updatedPoly]).attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '));

    if (this.isShapeIntersects(updatedPoly)) {
      this.showIntersectionWarning();
    } else if (this.activeShapeIntersectionWarning) {
      this.hideIntersectionWarning();
    }
  }

  saveSquare(): void {
    if (this.activeShapeIntersectionWarning) {
      return;
    }

    const [poly] = this.activeShape.data();
    const areaObject = {
      type: this.mode === InfrastructureMapMode.RESTRICTED_RECTANGLE ? 'RESTRICTED' : 'TARGET',
      shape: {
        polygonPoints: poly,
      }
    };
    this.activeShape.remove();
    this.exitEditMode();
    this.infrastructureMapService.addShape(new Area(this.view, this.infrastructureMapService, areaObject, this.areasService));
  }

  /* SQUARE SECTION END*/

  /* WAYPOINT SECTION */
  addWaypoint(): void {
    const { offsetX, offsetY, target } = this.d3Event;
    const waypoint = new Waypoint(this.view, this.infrastructureMapService);
    this.infrastructureMapService.addShape(waypoint);
    waypoint.moveTo({
      x: offsetX,
      y: offsetY,
    });
    this.infrastructureMapService.setActiveShape(waypoint.id);
    this.exitEditMode();
    this.shapeAdded.emit({
      type: ShapeType.WAYPOINT,
      shape: waypoint,
      parent: target && target.nodeName === 'polygon' && target.dataset.id,
    });
  }

  /* WAYPOINT SECTION END */

  isShapeIntersects(points: Coordinates[]): boolean {
    const restricted = this.mode === InfrastructureMapMode.RESTRICTED_RECTANGLE || this.mode === InfrastructureMapMode.RESTRICTED_SHAPE;
    const include = restricted ? ['AREAS', 'STATIONS'] : ['AREAS'] as any;
    return this.infrastructureMapService.checkShapesIntersection(points, this.activeShapeId, include)
      || this.infrastructureMapService.isShapeLinesIntersect(points, this.activeShapeId, include);
  }

  showIntersectionWarning(): void {
    const { offsetX, offsetY } = this.d3Event;
    if (!this.activeShapeIntersectionWarning) {
      this.activeShapeIntersectionWarning = new Tooltip(this.view, 'Areas should not intersect');

      if (this.activeShapeId) {
        this.activeShape.attr('fill', hexToRGB('#e96058', 0.2)).attr('stroke', '#e96058');
      }
    }
    this.activeShapeIntersectionWarning.setCoordinates({
      x: offsetX,
      y: offsetY,
    });
  }

  hideIntersectionWarning(): void {
    this.activeShapeIntersectionWarning.destroy();
    this.activeShapeIntersectionWarning = null;
    const restricted = this.mode === InfrastructureMapMode.RESTRICTED_RECTANGLE || this.mode === InfrastructureMapMode.RESTRICTED_SHAPE;
    if (this.activeShapeId) {
      this.activeShape
        .attr('stroke', restricted ? '#eeeeee' : '#dcbc65')
        .attr('fill', restricted ? this.areaFills.restricted : this.areaFills.standard);
    }
  }

  exitEditMode(): void {
    if (this.activeShapeId) {
      try {
        this.activeShape.remove();
      } catch (e) { }
    }

    const unsavedArea = this.infrastructureMapService.getShapeById(this.activeShapeId);
    if (unsavedArea) {
      this.infrastructureMapService.removeShape(unsavedArea.id);
    }

    this.activeShapeId = null;
    if (this.areaPoints) {
      for (const point of this.areaPoints) {
        point.remove();
      }
      this.areaPoints = [];
    }
    if (this.activeStation) {
      if (!this.activeStation.saved) {
        this.activeStation.destroy();
        this.infrastructureMapService.removeShape(this.activeStation.id);
        this.activeStation = null;
      }
    }
    if (this.activeDevice) {
      if (!this.activeDevice.saved) {
        this.activeDevice.destroy();
        this.infrastructureMapService.removeShape(this.activeDevice.id);
        this.activeDevice = null;
      }
    }
    this.mode = null;
  }

  addTask(): void {
    this.infrastructureMapService.onAddTask(this.selectedAreaId);
    this.closeAddTaskButton();
  }

  private openAddTaskButton(areaId: string, boundingRect: BoundingRect): void {
    this.isAddTaskButtonToBottom = boundingRect.top - this.editorContainer.nativeElement.getBoundingClientRect().top < 50;

    const positionLeft = `${boundingRect.right - 102}px`;
    const positionTop = `${this.isAddTaskButtonToBottom ? (boundingRect.bottom + 9) : (boundingRect.top - 50)}px`;

    this.addTaskButtonStyles.left = positionLeft;
    this.addTaskButtonStyles.top = positionTop;
    this.selectedAreaId = areaId;
    this.isAddTaskButtonOpened = true;
  }

  closeAddTaskButton(): void {
    this.selectedAreaId = null;
    this.isAddTaskButtonOpened = false;
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  onEditorMouseMove(event: MouseEvent): void {
    this.infrastructureMapService.onEditorMouseMove(event);
  }

  ngOnDestroy(): void {
    this.infrastructureMapService.setMode(null);
    try {
      this.subscriptions.unsubscribe();
    } catch (e) {
    }
  }
}
