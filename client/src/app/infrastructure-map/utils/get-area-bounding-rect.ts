import { Coordinates } from '../shared/interfaces/coordinates.interface';
import { BoundingRect } from '../shared/interfaces/bounding-rect.interface';

export const getAreaBoundingRect = (points: Coordinates[] = []): BoundingRect => {
  const areaRect: BoundingRect = points.reduce((rect, { x, y }) => {
    return {
      left: x < rect.left ? x : rect.left,
      top: y < rect.top ? y : rect.top,
      bottom: y > rect.bottom ? y : rect.bottom,
      right: x > rect.right ? x : rect.right,
    };
  }, {
    left: points[0].x,
    top: points[0].y,
    bottom: points[0].y,
    right: points[0].x
  });
  areaRect.left = Math.round(areaRect.left);
  areaRect.right = Math.round(areaRect.right);
  areaRect.top = Math.round(areaRect.top);
  areaRect.bottom = Math.round(areaRect.bottom);
  areaRect.width = areaRect.right - areaRect.left;
  areaRect.height = areaRect.bottom - areaRect.top;
  return areaRect;
};
