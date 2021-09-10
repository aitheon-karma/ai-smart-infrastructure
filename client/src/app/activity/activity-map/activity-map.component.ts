import { Floor, InfrastructureTask } from '@aitheon/smart-infrastructure';
import { Component, Input, ViewChild, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Area, InfrastructureMapComponent, InfrastructureMapService } from '../../infrastructure-map';
import { StructureService } from '../../structure/structure.service';

@Component({
  selector: 'ai-activity-map',
  templateUrl: './activity-map.component.html',
  styleUrls: ['./activity-map.component.scss']
})
export class ActivityMapComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('mapView') mapView: InfrastructureMapComponent;
  @Input() task: InfrastructureTask;

  public isLoading: boolean = true;
  private subscriptions$ = new Subscription();
  public mapShapes: any[] = [];
  public floor: Floor;
  public mapStyles = {
    width: '100%',
    height: 'calc(100vh - 240px)',
    maxHeight: 'calc(100vh - 240px)',
  };

  constructor(
    private structureService: StructureService,
    private infrastructureMapService: InfrastructureMapService,
  ) {}

  ngOnInit(): void {
    this.infrastructureMapService.setReadonly(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.task?.currentValue) {
      this.isLoading = true;
      this.setFloor();
      this.loadMapData();
    }
  }

  private setFloor(): void {
    this.floor = this.task.infrastructure?.floors?.find(({ _id }) => _id === this.task.floor);
  }

  private loadMapData(): void {
    this.subscriptions$.add(this.structureService.getFloorShapes(this.task.floor as any)
      .subscribe(([areas, stations, devices]) => {
        this.mapShapes = [...areas, ...stations, ...devices];
        this.isLoading = false;
      }));
  }

  public onShapesAdd(): void {
    if (this.task.area) {
      this.infrastructureMapService.transparentize(this.task.area._id);
      const area = this.infrastructureMapService.getShapeById(this.task.area._id) as Area;
      if (area) {
        area.showOverlayImage(this.task.finalSnapshot?.signedUrl);
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
    this.infrastructureMapService.setReadonly(false);
  }
}
