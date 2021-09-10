import { InfrastructureMapService } from '../services/infrastructure-map.service';
import { uuidv4 } from '../utils/uuidv4';
import { Shape } from './shape';
import { Coordinates } from '../shared/interfaces/coordinates.interface';

import * as d3 from 'd3';

export class Waypoint extends Shape {
  private waypoint: any;
  private scale = 1;
  public coordinates: Coordinates;

  constructor(
    view: any,
    infrastructureMapService: InfrastructureMapService,
    waypointDb?: any,
  ) {
    super(view, waypointDb, infrastructureMapService);

    this.createWaypoint();
  }

  createWaypoint(): void {
    this.group = this.view.append('g');
    this.id = uuidv4();

    this.coordinates = {
      x: -24,
      y: -24,
    };

    this.waypoint = this.group.append('svg:image')
      .attr('data-id', this.id)
      .attr('x', String(this.coordinates.x))
      .attr('y', String(this.coordinates.y))
      .attr('width', String(24))
      .attr('height', String(24))
      .style('cursor', 'pointer')
      .attr('xlink:href', 'assets/img/infrastructure-map/waypoint-ic.svg');

    if (!this.dbData) {
      this.saved = false;
      this.editing = true;
    } else {
      this.id = this.dbData.id;
      this.moveTo(this.dbData.coordinates);
    }

    this.setListeners();
  }

  private setListeners(): void {
    this.onDrag();
    this.listenToMapScale();
  }

  private onDrag(): void {
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

  listenToMapScale(): void {
    this.subscriptions$.add(this.infrastructureMapService.mapScale$.subscribe(scale => {
      this.scale = scale;
      this.waypoint
        .attr('width', `${Math.round(24 / scale)}`)
        .attr('height', `${Math.round(24 / scale)}`);
      this.adjustViewPosition();
    }));
  }

  public moveTo(coordinates: Coordinates): void {
    this.coordinates = coordinates;
    this.adjustViewPosition();
  }

  adjustViewPosition(): void {
    if (this.coordinates) {
      this.waypoint
        .attr('x', String(Math.round(this.coordinates.x - (4 / this.scale))))
        .attr('y', String(Math.round(this.coordinates.y - (20 / this.scale))));
    }
  }

  public highlight(): void {}

  public dismissEdit(): void {
    this.editing = false;
  }

  public destroy(): void {
    this.group.remove();
    try {
      this.subscriptions$.unsubscribe();
    } catch (e) {}
  }
}
