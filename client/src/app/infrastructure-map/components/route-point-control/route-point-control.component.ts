import { Component, HostListener, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { ShapeRouteType } from '../../shared/enums/area-route-type.enum';
import { RoutePointAction } from '../../shared/enums/route-point-action.enum';
import { Coordinates } from '../../shared/interfaces/coordinates.interface';
import { AreasService } from '../../services/areas.service';
import { InfrastructureMapService } from '../../services/infrastructure-map.service';

import { Subscription } from 'rxjs';

@Component({
  selector: 'ai-route-point-control',
  templateUrl: './route-point-control.component.html',
  styleUrls: ['./route-point-control.component.scss']
})
export class RoutePointControlComponent implements OnInit, OnDestroy {
  @ViewChild('ncButton') ncButton: ElementRef;
  @ViewChild('control') control: ElementRef<HTMLDivElement>;

  subscriptions$ = new Subscription();
  position: {
    left: string,
    top: string,
  };
  color: any;
  controlSize = 42;
  type: ShapeRouteType;
  types = ShapeRouteType;
  actions = RoutePointAction;
  show: boolean;
  dragging: boolean;
  newRouteAdded: boolean;
  coordinates: Coordinates;
  dragStartCoordinates: {
    x: number,
    y: number,
  };
  initDragPosition: {
    x: number,
    y: number,
  };
  pointId: string;
  areaId: string;
  isLast: boolean;
  isEdit: boolean;
  pointIndex: number;
  restrictRemoval: boolean;
  ncModalOpen: boolean;
  isChargeStation: boolean = false;
  chargeStationType: string;
  pointerCoordinates: Coordinates;
  scale: number;

  constructor(
    private infrastructureMapService: InfrastructureMapService,
    private areasService: AreasService,
  ) {}

  ngOnInit(): void {
    this.listenToMapScale();
    this.listenToControlHide();
    this.listenToActiveRoutePointChange();
    this.listenToCommandsSave();
    this.areasService.routePointSelected
      .subscribe(data => {
        console.log(data);
        
        this.areaId = data.areaId;
        this.isLast = data.isLast;
        this.pointIndex = data.pointIndex;
        this.pointId = data.pointId;
        this.isEdit = data.isEdit;
        this.restrictRemoval = data.restrictRemoval;
        this.type = data.type;
        this.coordinates = data.coordinates;
        this.position = {
          left: `${data.coordinates.x}px`,
          top: `${data.coordinates.y}px`,
        };
        this.show = true;
        this.isChargeStation = data.chargeStation;
        this.chargeStationType = data.chargeStationType;
      });
  }

  listenToMapScale(): void {
    this.subscriptions$.add(this.infrastructureMapService.mapScale$.subscribe(scale => {
      this.scale = scale;
    }));
  }

  listenToControlHide(): void {
    this.subscriptions$.add(this.areasService.triggerRoutePointControlHide.subscribe(() => {
      this.show = false;
    }));
  }

  listenToActiveRoutePointChange(): void {
    this.subscriptions$.add(this.areasService.activeRoutePointChanged.subscribe(({ pointId }) => {
      this.pointId = pointId;
    }));
  }

  listenToCommandsSave(): void {
    this.subscriptions$.add(this.areasService.routePointNcSaved.subscribe(() => {
      this.ncModalOpen = false;
    }));
  }

  onDragStart(event?: MouseEvent): void {
    if (!this.isEdit) return;
    this.dragging = true;
    this.infrastructureMapService.setMapTranslateRestriction(true);
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: Event) {
    if (this.show && (this.dragging || this.newRouteAdded)) {
      this.dropControl();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isEdit && (this.dragging || this.newRouteAdded)) {
      const clientDX = event.clientX - this.pointerCoordinates.x;
      const clientDY = event.clientY - this.pointerCoordinates.y;
      
      this.coordinates.x += clientDX / this.scale;
      this.coordinates.y += clientDY / this.scale;
      this.position = {
        left: `${this.coordinates.x}px`,
        top: `${this.coordinates.y}px`,
      };
      this.areasService.onActivePointMove({ coordinates: this.coordinates, shapeId: this.areaId });
    }

    this.pointerCoordinates = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  onClickOutside(event: Event): void {
    if (!this.isEdit || this.isEdit && !this.ncModalOpen) {
      this.show = false;
      this.areasService.onRoutePointDrop(this.coordinates, this.areaId, true);
    }
  }

  triggerAction(action: RoutePointAction, type?: ShapeRouteType, event?: MouseEvent): void {
    if (type) {
      this.type = type;
    }
    
    if (event) {
      this.adjustCoordinates(event);
    }

    const data = {
      action,
      areaId: this.areaId,
      type,
      meta: {
        coordinates: this.coordinates,
      },
    };

    this.areasService.onRoutePointControlAction(data);

    switch (action) {
      case RoutePointAction.ADD:
        this.newRouteAdded = true;
        this.restrictRemoval = false;
        this.isLast = true;
        this.chargeStationType = '';
        this.infrastructureMapService.setMapTranslateRestriction(true);
        break;
      case RoutePointAction.NC:
        this.ncModalOpen = true;
        this.areasService.onOpenCommandsModal({
          areaId: this.areaId,
          pointId: this.pointId,
          coordinates: this.getNcButtonScreenPosition(),
          isEdit: this.isEdit,
        });
        break;
      case RoutePointAction.REMOVE:
        this.show = false;
        this.newRouteAdded = false;
        this.dragging = false;
        this.infrastructureMapService.setMapTranslateRestriction(false);
        break;
      default:
        break;
    }
  }

  adjustCoordinates(event: MouseEvent): void {
    const controlRect = this.control.nativeElement.getBoundingClientRect();
    const clientDX = event.clientX - controlRect.left;
    const clientDY = event.clientY - controlRect.top;
    this.coordinates = { ...this.coordinates };
    this.coordinates.x += clientDX / this.scale;
    this.coordinates.y += clientDY / this.scale;
  }

  dropControl(): void {
    if (!this.isEdit) return;
    this.dragging = false;
    this.newRouteAdded = false;
    this.initDragPosition = null;
    this.dragStartCoordinates = null;
    this.infrastructureMapService.setMapTranslateRestriction(false);
    this.areasService.onRoutePointDrop(this.coordinates, this.areaId);
  }

  getNcButtonScreenPosition(): Coordinates {
    const ncButtonBoundingRect = this.ncButton.nativeElement.getBoundingClientRect();
    return {
      x: ncButtonBoundingRect.left + ncButtonBoundingRect.width / 2,
      y: window.innerHeight - (ncButtonBoundingRect.bottom - ncButtonBoundingRect.height),
    };
  }

  get isDockChargeStation() {
    return this.chargeStationType === 'CHARGING_DOCK' && this.pointIndex === 0;
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {
    }
  }
}
