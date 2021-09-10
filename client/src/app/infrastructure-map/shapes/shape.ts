import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { InfrastructureMapService } from '../services/infrastructure-map.service';
import { Tooltip } from '../shared/tooltip';
import { Coordinates } from '../shared/interfaces/coordinates.interface';
import { Text } from '../shared/text';

export class Shape {
  mapId: string;
  id: string;
  subscriptions$: Subscription = new Subscription();
  group: any;
  editing: boolean;
  saved: boolean;
  intersectionWarning: Tooltip;
  readonly: boolean;
  moreDropdownOpened: boolean;
  hovered: boolean;
  onSelect(): void {}
  removeHighlight(): void {};
  onSetReadOnly(id): void {};
  onActive(): void {};
  textValue: Text;

  constructor(
    public view: any,
    public dbData: any,
    public infrastructureMapService: InfrastructureMapService,
  ) {
    this.mapId = this.infrastructureMapService.mapId;
  }

  public openOptionsDropdown(coordinates: Coordinates): void {
    this.moreDropdownOpened = true;
    this.infrastructureMapService.showShapeOptionsDropdown(coordinates, this.dbData);
    this.onSelect();
  }

  get d3Event(): any {
    return d3.event;
  }

  public listenToOptionsDropdownClose(): void {
    this.subscriptions$.add(this.infrastructureMapService.shapeOptionsDropdownClosed.subscribe((shapeId: string) => {
      if (shapeId === this.id) {
        this.moreDropdownOpened = false;
      }
    }));
  }

  onContextMenu(): void {
    this.group.on('contextmenu', () => {
      if (!this.editing && !this.readonly && !this.infrastructureMapService.isReadonly() && this.saved) {
        this.openOptionsDropdown({ x: this.d3Event.clientX, y: this.d3Event.clientY });
      }
    });
  }

  public setReadonly(): void {
    this.readonly = true;
  }

  public setActive() {
    this.readonly = false;
  }

  public hideShapeName() {
    this.textValue.hideShapeName();
  }

  public showShapeName() {
    this.textValue.showShapeName();
  }
}
