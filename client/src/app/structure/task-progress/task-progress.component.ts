import { MapOverlay } from '@aitheon/smart-infrastructure';
import { Component, AfterViewInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AreasService } from '../../infrastructure-map';

import { Observable, Subscription } from 'rxjs';
import { CircleProgress } from '../../infrastructure-map/shapes/circle-progress';
import * as d3 from 'd3';

@Component({
  selector: 'ai-task-progress',
  template: '<svg [id]="svgId"></svg>',
  styleUrls: ['./task-progress.component.scss']
})
export class TaskProgressComponent implements AfterViewInit, OnChanges {
  @Input() objectId: string;
  @Input() color: string;
  svgId: string;
  view: any;
  overlay$: Observable<MapOverlay>;
  overlaySubscription: Subscription;

  circleProgress: CircleProgress;

  constructor(
    private areasService: AreasService,
  ) {
    this.svgId = this.makeId();
  }

  ngAfterViewInit(): void {
    this.view = d3.select(`#${this.svgId}`)
                  .attr('width', 0)
                  .attr('height', 0);;

    this.overlay$ = this.areasService.areaOverlay(this.objectId);

    this.overlaySubscription = this.overlay$.subscribe(overlay => {
      if (overlay) {
        if (!this.circleProgress) {
          this.view.attr('width', 24)
                   .attr('height', 24);
          this.circleProgress = new CircleProgress(this.view, {
            color: this.color,
            coordinates: {
              x: 12,
              y: 12,
            },
          });
        }
        // if (overlay.overallProgress === 100) {
        //   this.removeCircleProgress();
        //   return;
        // }
        this.circleProgress.setProgress(overlay.overallProgress);
      } else {
        this.removeCircleProgress();
        this.view.attr('width', 0)
                  .attr('height', 0);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.color && this.circleProgress) {
      this.circleProgress.updateColor(changes.color.currentValue);
    }
  }

  private removeCircleProgress(): void {
    this.circleProgress.destroy();
    this.circleProgress = null;
  }

  makeId(): string {
    let result = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < 28; i++) {
      result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
    }
    return result.join('');
  }

}
