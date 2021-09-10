export interface DetectedDevice {
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturer: string;
  serialNumber: string;
  deviceAddress: number;
  path?: string;
  protocol: string;
  communicationType?: string;
}
