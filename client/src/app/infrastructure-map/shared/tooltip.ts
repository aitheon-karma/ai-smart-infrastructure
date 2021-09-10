import { Coordinates } from './interfaces/coordinates.interface';

export class Tooltip {
  private coordinates: Coordinates;
  private tooltip: any;
  private backgroundRect: any;

  constructor(
    private view: any,
    private text: any,
  ) {
    this.initTooltip();
  }

  initTooltip(): void {
    this.backgroundRect = this.view.append('rect')
      .attr('width', 156)
      .attr('height', 36)
      .attr('fill', '#383838')
      .attr('rx', 2)
      .attr('ry', 2);

    this.tooltip = this.view.append('text')
      .attr('font-family', 'ProximaNova')
      .attr('font-size', '12px')
      .attr('fill', '#ffffff')
      .text(this.text)
      .style('text-anchor', 'middle');
  }

  public setCoordinates(coordinates: Coordinates): void {
    this.coordinates = coordinates;

    this.backgroundRect.attr('x', coordinates.x - 78).attr('y', coordinates.y - 47);
    this.tooltip.attr('x', coordinates.x).attr('y', coordinates.y - 25);
  }

  public destroy(): void {
    this.tooltip.remove();
    this.backgroundRect.remove();
    this.coordinates = null;
  }
}
