import { Coordinates } from '../shared/interfaces/coordinates.interface';

export const findTopLeftPointFromPoints = (points: Coordinates[]): Coordinates => {
  const leftTopCoords = points.reduce((result, point) => {
    return {
      x: point.x < result.x ? point.x : result.x,
      y: point.y < result.y ? point.y : result.y,
    };
  }, points[0]) as Coordinates;
  const coordinatesSum = leftTopCoords.x + leftTopCoords.y;

  return points.reduce((result, point) => {
    const previousDelta = (result.x + result.y) - coordinatesSum;
    const currentDelta = (point.x + point.y) - coordinatesSum;
    if (currentDelta < previousDelta) {
      return point;
    }
    return result;
  }, points[0]);
};
