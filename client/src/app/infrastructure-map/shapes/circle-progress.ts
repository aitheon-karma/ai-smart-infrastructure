import { Coordinates } from '..';

export class CircleProgress {
  group: any;
  backgroundCircle: any;
  progressCircle: any;
  radius = 8;

  constructor(
    private view: any,
    private data: {
      color: string,
      coordinates: Coordinates,
    },
    percents?: number
  ) {
    this.createProgress(percents);
  }

  private createProgress(percents: number): void {
    this.group = this.view.append('g');

    this.progressCircle = this.group.append('circle')
                                    .classed('progress', true)
                                    .attr('fill', '#383838')
                                    .attr('r', this.radius)
                                    .attr('cx', this.data.coordinates.x)
                                    .attr('cy', this.data.coordinates.y)
                                    .attr('stroke-dasharray', this.radius * 2 * Math.PI)
                                    .attr('stroke', this.data.color)
                                    .attr('transform', `rotate(-90 ${this.data.coordinates.x} ${this.data.coordinates.y})`);

    this.backgroundCircle = this.group.append('circle')
          .classed('progress-bg', true)
          .attr('fill', 'transparent')
          .attr('r', this.radius)
          .attr('cx', this.data.coordinates.x)
          .attr('cy', this.data.coordinates.y)
          .attr('stroke', this.data.color);

    if (percents >= 0) {
      this.setProgress(percents);
    }
  }

  public setProgress(progress: number): void {
    const c = Math.PI*(this.radius * 2);
    if (progress < 0) {
      progress = 0;
    }
    if (progress > 100) {
      progress = 100;
    }

    const percents = ((100 - progress) / 100) * c;
    this.progressCircle.attr('stroke-dashoffset', percents);
    this.group.raise();
  }

  public destroy(): void {
    this.group?.remove();
  }

  public updateColor(color: string) {
    this.progressCircle.attr('stroke', color);
    this.backgroundCircle.attr('stroke', color);
  }
}
