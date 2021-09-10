import { Coordinates } from '../shared/interfaces/coordinates.interface';
import { getAreaBoundingRect } from './get-area-bounding-rect';

export const getCenterCoordinatesFromPoints = (points: Coordinates[] = []): Coordinates => {
  const boundingRect = getAreaBoundingRect(points);
  return {
    x: boundingRect.left + boundingRect.width / 2,
    y: boundingRect.top + boundingRect.height / 2,
  };
};
