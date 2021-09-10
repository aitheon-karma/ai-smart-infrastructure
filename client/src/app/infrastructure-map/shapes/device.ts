import * as d3 from 'd3';
import { DevicesService } from '../services/devices.service';
import { InfrastructureMapService } from '../services/infrastructure-map.service';
import { DeviceSubtype } from '../shared/enums/device-subtype.enum';

import { Coordinates } from '../shared/interfaces/coordinates.interface';
import { uuidv4 } from '../utils/uuidv4';
import { Shape } from './shape';

export class Device extends Shape {
  coordinates: Coordinates;
  circle: any;
  ring: any;
  icon: any;
  type: DeviceSubtype;
  scale = 1;
  private isFirstMove = true;
  private highlighted: boolean;
  // TODO use real robot rotation
  private rotation = 30;

  constructor(
    view: any,
    infrastructureMapService: InfrastructureMapService,
    private devicesService: DevicesService,
    deviceDb?: any,
  ) {
    super(view, deviceDb, infrastructureMapService);
    this.createDevice();
  }

  private createDevice(): void {
    this.id = this.dbData && this.dbData._id || uuidv4();
    this.type = this.dbData?.subType;
    this.saved = this.type !== DeviceSubtype.TAG && this.dbData?._id;

    this.group = this.view.append('g').style('cursor', 'pointer');

    switch (this.type) {
      case DeviceSubtype.TAG:
        this.renderTag();
        break;
      case DeviceSubtype.ANCHOR:
        this.renderAnchor();
        break;
      case DeviceSubtype.CAMERA:
        this.renderCamera();
        break;
      case DeviceSubtype.ROBOT:
        this.renderRobot();
        break;
    }

    const coordinates = {
      x: this.dbData?.pose?.x || this.dbData?.currentPosition?.translation?.x || -10,
      y: this.dbData?.pose?.y || this.dbData?.currentPosition?.translation?.y || -10
    } as Coordinates;

    this.moveTo(coordinates);

    this.setListeners();
    this.listenToMapScale();
  }

  private setListeners(): void {
    this.onClick();
    this.onMapClick();
    this.onHover();
    this.onDrag();
    if (![DeviceSubtype.TAG, DeviceSubtype.ROBOT].includes(this.type)) {
      this.onContextMenu();
    }
  }

  public startEdit(): void {
    this.editing = true;
    this.highlight();
  }

  public getData(): any {
    return {
      name: this.dbData.name ? this.dbData.name : '',
      type: this.type,
      shape: {
        polygonPoints: this.coordinates,
      },
    };
  }

  private renderTag(): void {
    this.circle = this.group.append('circle')
      .attr('r', '6')
      .attr('fill', '#dcbc65')

    this.ring = this.group.append('circle')
      .attr('r', '11')
      .attr('fill', 'transparent')
      .attr('stroke', '#dcbc65')
      .attr('stroke-width', '1.5')
  }

  private renderAnchor(): void {
    this.icon = this.group.append('svg:image')
      .attr('x', -24)
      .attr('y', -24)
      .attr('width', 24)
      .attr('height', 24)
      .attr('xlink:href', 'assets/img/infrastructure-map/anchor-map.svg')
      .classed('device-image', true);
  }

  private renderCamera(): void {
    this.icon = this.group.append('svg:image')
      .attr('x', -24)
      .attr('y', -24)
      .attr('width', 24)
      .attr('height', 24)
      .attr('xlink:href', 'assets/img/infrastructure-map/camera-map.svg')
      .classed('device-image', true);
  }

  private renderRobot(): void {
    this.icon = this.group.append('polygon')
      .data([[{ x: 0, y: -10 }, { x: 9, y: 10 }, { x: -9, y: 10 }]])
      .attr('points', d => d.map(point => [point.x, point.y].join(',')).join(' '))
      .attr('fill', '#67b231')
      .attr('stroke', '#67b231');
  }

  private onClick(): void {
    this.group.on('mousedown', () => {
      if (![DeviceSubtype.TAG, DeviceSubtype.ROBOT].includes(this.type) && !this.saved) {
        this.devicesService.onDevicePlaced(this.type);
        return;
      }

      this.highlight();

      if (!this.readonly) {
        this.devicesService.onDeviceSelect(this.id, this.getClientCoordinates());
      }
    });
  }

  public getClientCoordinates(offsetCoordinates?: Coordinates): Coordinates {
    let dummyEl;
    if (offsetCoordinates) {
      dummyEl = this.view.append('circle')
        .attr('r', '1')
        .attr('cx', offsetCoordinates.x)
        .attr('cy', offsetCoordinates.y);
    }
    const boundingRect = dummyEl ? dummyEl.node().getBoundingClientRect() : this.group.node().getBoundingClientRect();
    if (dummyEl) {
      dummyEl.remove();
    }
    return {
      x: Math.round(boundingRect.left + (boundingRect.width / 2)),
      y: Math.round(boundingRect.top + (boundingRect.height / 2)),
    };
  }

  private listenToMapScale(): void {
    this.subscriptions$.add(this.infrastructureMapService.mapScale$.subscribe(scale => {
      this.scale = scale;
      if (this.type === DeviceSubtype.TAG) {
        this.circle.attr('r', `${Math.round(6 / scale)}`);
        this.ring.attr('r', `${Math.round(11 / scale)}`);
        return;
      }
      this.icon
        ?.attr('width', `${Math.round(24 / scale)}`)
        .attr('height', `${Math.round(24 / scale)}`);
    }));
  }

  public moveTo(coordinates: Coordinates): void {
    this.coordinates = coordinates;
    const transition = this.isFirstMove ? 0 : 300;
    switch (this.type) {
      case DeviceSubtype.TAG:
        this.circle
          .transition()
          .duration(transition)
          .attr('cx', this.coordinates.x)
          .attr('cy', this.coordinates.y);
        this.ring
          .transition()
          .duration(transition)
          .attr('cx', this.coordinates.x)
          .attr('cy', this.coordinates.y);
        break;
      case DeviceSubtype.ANCHOR:
      case DeviceSubtype.CAMERA:
        this.icon
          .attr('x', `${this.coordinates.x - Math.round(12 / this.scale)}`)
          .attr('y', `${this.coordinates.y - Math.round(12 / this.scale)}`);
        break;
      case DeviceSubtype.ROBOT:
        this.icon
          .transition()
          .duration(transition)
          .attr('transform', d => `translate(${this.coordinates.x},${this.coordinates.y}) rotate(${this.rotation})`)
    }
    this.isFirstMove = false;
  }

  onDrag(): void {
    this.group.call(d3.drag()
      .on('start', () => {
        if (this.editing || !this.saved) {
          this.group.raise();
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
  }

  public update(deviceDb: any): void {
    this.dbData = deviceDb;
    this.id = deviceDb._id;
    this.saved = true;
    this.editing = false;
    this.removeHighlight();
  }

  onMapClick(): void {
    this.subscriptions$.add(this.infrastructureMapService.mapClicked.subscribe(() => {
      if (this.saved && !this.editing && !this.hovered && this.highlighted) {
        this.removeHighlight();
      }
    }));
  }

  onHover(): void {
    this.group.on('mouseenter', () => {
      this.hovered = true;
    });
    this.group.on('mouseleave', () => {
      this.hovered = false;
    });
  }

  public highlight(): void {
    if (!this.readonly) {
      this.highlighted = true;

      switch (this.type) {
        case DeviceSubtype.CAMERA:
          this.icon.attr('xlink:href', 'assets/img/infrastructure-map/camera-map-active.svg')
          break;

        case DeviceSubtype.ANCHOR:
          this.icon.attr('xlink:href', 'assets/img/infrastructure-map/anchor-map-active.svg')
          break;

        default:
          break;
      }
    }
  }

  public transparentize(): void {
    this.icon?.style('opacity', 0.5);
  }

  public visible(): void {
    this.icon?.style('opacity', 1);
  }

  public unTransparentize(): void {
    this.icon?.style('opacity', 1);
  }

  public dismissEdit(): void {
    this.editing = false;
    this.removeHighlight();

    const coordinates = {
      x: this.dbData?.pose?.x || this.dbData?.currentPosition?.translation?.x || -10,
      y: this.dbData?.pose?.y || this.dbData?.currentPosition?.translation?.y || -10
    } as Coordinates;

    this.moveTo(coordinates);
  }

  public removeHighlight():void {
    this.highlighted = false;

    switch (this.type) {
      case DeviceSubtype.CAMERA:
        this.icon.attr('xlink:href', 'assets/img/infrastructure-map/camera-map.svg')
        break;

      case DeviceSubtype.ANCHOR:
        this.icon.attr('xlink:href', 'assets/img/infrastructure-map/anchor-map.svg')
        break;

      default:
        break;
    }
  }

  public destroy(): void {
    this.group.remove();

    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {}
  }
}
