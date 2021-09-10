export const getFormattedFloorNumber = (floorNumber: number): string => {
  const isNumber = !isNaN(floorNumber);
  const isAbsLessThanTen = Math.abs(floorNumber) < 10;
  const isNegative = floorNumber < 0;
  let formattedFloorNumber = '';

  if (isNumber) {
    formattedFloorNumber = isAbsLessThanTen ? `0${Math.abs(floorNumber)}` : `${Math.abs(floorNumber)}`;
    formattedFloorNumber = isNegative ? `-${formattedFloorNumber}` : `${formattedFloorNumber}`;
  }

  return formattedFloorNumber;
};
