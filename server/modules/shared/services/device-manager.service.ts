import { Inject, Service } from 'typedi';
import { Current } from '@aitheon/core-server';
import { DeviceSchema } from '../models/device.model';
import { DevicesApi, Device, SystemsApi, System, DeviceSearch } from '@aitheon/device-manager-server';
import { WebsocketService, WS_EVENTS } from '../../core/websocket.service';
import { Translation } from '../models/shared.model';

const DEVICE_MANAGER_BASE_PATH = `https://${process.env.DOMAIN || 'dev.aitheon.com'}/device-manager`;
// const DEVICE_MANAGER_BASE_PATH = `http://localhost:3001`;


@Service()
export class DeviceManagerService {

  @Inject()
  socketService: WebsocketService;

  devicesApi: DevicesApi;
  systemsApi: SystemsApi;

  constructor() {
    this.devicesApi = new DevicesApi(DEVICE_MANAGER_BASE_PATH);
    this.systemsApi = new SystemsApi(DEVICE_MANAGER_BASE_PATH);
  }

  async createDevice(systemId: string, device: Device, current: Current): Promise<Device> {
    return (await this.devicesApi.register(
      systemId,
      device,
      undefined,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async createSystem(name: string, referenceType: System.ReferenceTypeEnum, current: Current, parent: string = ''): Promise<string> {
    const body = {
      name,
      referenceType,
      organization: current.organization._id,
      createdBy: current.user._id
    } as System;
    if (parent) {
      body.parent = parent;
    }

    const system = (await this.systemsApi.create(body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
    return system._id;
  }

  async changeParentSystem(systemId: string, newParent: string, current: Current): Promise<any> {
    return (await this.systemsApi.update(systemId, { parent: newParent } as System,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async removeSystem(systemId: string, current: Current): Promise<any> {
    return (await this.systemsApi.remove(systemId, {
      headers: {
        'Authorization': `JWT ${current.token}`,
        'organization-id': current.organization._id
      }
    })).body;
  }

  async listDevices(systemId: string, current: Current): Promise<Device[]> {
    return (await this.devicesApi.list(
      systemId,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async deviceSearch(filter: DeviceSearch, current: Current): Promise<Device[]> {
    return (await this.devicesApi.search(
      filter,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async updateDevice(deviceId: string, body: Device, current: Current): Promise<Device> {
    return (await this.devicesApi.updateDevice(
      deviceId,
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async getLinkedDevices(controllerId: string, current: Current): Promise<Device[]> {
    return (await this.devicesApi.search(
      { controller: controllerId },
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async deleteDevice(deviceId: string, current: Current): Promise<Device> {
    return (await this.devicesApi.removeDevice(
      deviceId,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async removeDeviceFromOrg(deviceId: string, current: Current): Promise<Device> {
    const body = {
      // tslint:disable-next-line: no-null-keyword
      organization: null,
      // tslint:disable-next-line: no-null-keyword
      system: null,
      // tslint:disable-next-line: no-null-keyword
      station: null,
      // tslint:disable-next-line: no-null-keyword
      floor: null,
      // tslint:disable-next-line: no-null-keyword
      infrastructure: null
    } as any;
    return await this.updateDevice(deviceId, body, current);
  }

  async deleteDevices(devices: string[], current: Current): Promise<any> {
    return Promise.all(devices.map(async (deviceId: string) => {
      return await this.deleteDevice(deviceId, current);
    }));
  }

  async getDeviceById(deviceId: string, current: Current): Promise<Device> {
    return (await this.devicesApi.getProfile(
      deviceId,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async changeDevicePosition(deviceId: string, position: Translation, organization: string) {
    const data = { position, device: deviceId };
    this.socketService.broadcast(organization, WS_EVENTS.CHANGE_POSITION, data);
  }


  // TO_DO: Move toDM:
  async getControllers(organization: string) {
    // tslint:disable-next-line: no-null-keyword
    return await DeviceSchema.find({ organization, canBeController: true, station: { $eq: null }, system: { $eq: null } }).lean();
  }

  async getDeviceBySerialNumber(serialNumber: string): Promise<Device> {
    return await DeviceSchema.findOne({ serialNumber }).lean();
  }

    // TEMPORARY ADD API for not aos device
    async createNotAosDevice(body: any): Promise<any> {
      return await DeviceSchema.create(body);
    }

  async addStationDevicesToFloor(stationId: string, floorId: string): Promise<any> {
    return await DeviceSchema.update({ station: stationId }, { floor: floorId });
  }

}
