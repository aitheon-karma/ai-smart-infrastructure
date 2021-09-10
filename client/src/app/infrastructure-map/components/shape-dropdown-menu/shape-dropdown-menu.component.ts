import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { InfrastructureMapService, DropdownAction } from '../../services/infrastructure-map.service';

import { Subscription } from 'rxjs';

@Component({
  selector: 'ai-shape-dropdown-menu',
  templateUrl: './shape-dropdown-menu.component.html',
  styleUrls: ['./shape-dropdown-menu.component.scss']
})
export class ShapeDropdownMenuComponent implements OnInit, OnDestroy {
  @Input() mode: 'DYNAMIC' | 'STATIC';
  @Input() show: boolean;
  @Input() position: {
    left: string,
    top?: string,
    bottom?: string,
  };
  @Input() shape: any;
  @Input() editorContainerBoundingRect: DOMRect;
  @Output() close = new EventEmitter<void>();

  actions = DropdownAction;

  private subscriptions = new Subscription();

  constructor(
    private infrastructureMapService: InfrastructureMapService,
  ) {}

  ngOnInit(): void {
    if (this.mode === 'DYNAMIC') {
      this.subscriptions.add(this.infrastructureMapService.shapeOptionsDropdownCalled
        .subscribe(({ dbData, coordinates }) => {
          const isTurnedToBottom = coordinates.y - this.editorContainerBoundingRect.top < 130;
          this.shape = dbData;
          this.position = {
            left: `${coordinates.x}px`,
          };
          if (isTurnedToBottom) {
            this.position.top = `${coordinates.y}px`;
          } else {
            const height = (['CHARGING', 'CHARGING_DOCK', 'CHARGING_TRACK', 'WORK', 'RESTRICTED'].includes(dbData.type) || this.shape.subType == 'CAMERA' || this.shape.subType == 'ANCHOR') ? 80 : 116;
            this.position.top = `${coordinates.y - height}px`;
          }
          this.show = true;
        }));
    }
  }

  triggerAction(action: DropdownAction, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.infrastructureMapService.onShapeDropDownAction(action, this.shape._id);
    if (this.mode === 'DYNAMIC') {
      this.hide();
    }
  }

  onClose(event: Event): void {
    if (this.mode === 'DYNAMIC' && this.shape && this.show) {
      this.hide();
    } else {
      this.close.emit();
    }
  }

  public get isOpened() {
    return this.show;
  }

  public hide(): void {
    this.show = false;
    this.infrastructureMapService.onShapeOptionsDropdownClose(this.shape._id);
  }

  get noAddTask() {
    return this.shape.type !== 'RESTRICTED' && this.shape.type !== 'CHARGING' && this.shape.type !== 'CHARGING_TRACK' && this.shape.type !== 'CHARGING_DOCK' && this.shape.subType !== 'CAMERA' && this.shape.subType !== 'ANCHOR' && this.shape.type !== 'WORK';
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions.unsubscribe();
    } catch (e) {}
  }
}
