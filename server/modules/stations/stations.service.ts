import Container, { Service, Inject } from 'typedi';
import { Transporter, TransporterService, Action, Event, param } from '@aitheon/transporter';
import { Station, StationSchema, StationType } from './station.model';
import { DeviceManagerService } from '../shared/services/device-manager.service';
import { Device } from '@aitheon/device-manager-server';
import { Current } from '@aitheon/core-server';
import { SystemGraphService } from '../shared/services/system-graph.service';


@Service()
@Transporter()
export class StationsService extends TransporterService {

  @Inject(() => DeviceManagerService)
  deviceManagerService: DeviceManagerService;

  @Inject(() => SystemGraphService)
  systemGraphService: SystemGraphService;

  constructor() {
    super(Container.get('TransporterBroker'));
  }

  async listByQuery(body: any): Promise<Station[]> {
    const { infrastructure, floor, type } = body;
    const query = {} as any;
    if (infrastructure) {
      query.infrastructure = infrastructure;
    }
    if (floor) {
      query.floor = floor;
    }
    if (type) {
      query.type = type;
    }

    return StationSchema.find(query)
      .populate('infrastructure', 'floors floors.name floors._id floors.number').lean();
  }


  async create(station: Station): Promise<Station> {
    return StationSchema.create(station);
  }

  async update(id: any, station: Station): Promise<Station> {
    return StationSchema.findByIdAndUpdate(id, station, { new: true }).lean();
  }

  async findById(stationId: string): Promise<Station> {
    return StationSchema.findById(stationId)
      .populate('applications')
      .populate({
        path: 'devices',
        select: '-ssh',
        populate: {
          path: 'type'
        }
      })
      .populate('controllers', '-ssh').lean();
  }

  async remove(stationId: string): Promise<Station> {
    return StationSchema.findByIdAndRemove(stationId);
  }

  async addApps(stationId: string, applications: string[]): Promise<Station> {
    return StationSchema.findByIdAndUpdate(stationId, { $push: { applications: { $each: applications }}});
  }

  async removeApps(stationId: string, applications: string[]): Promise<Station> {
    return StationSchema.findByIdAndUpdate(stationId, { $pull: { applications: { $each: applications }}});
  }

  async addDevices(stationId: string, devices: string[], current: Current): Promise<Device[]> {
    const station = await this.findById(stationId);
    return Promise.all(
      devices.map(async (deviceId: string) => {
        return await this.deviceManagerService.updateDevice(deviceId, { station: stationId, system: station.system } as Device, current);
      })
    );
  }

  async removeDevices(devices: string[], infrastructureSystem: string, current: Current): Promise<Device[]> {
    // tslint:disable-next-line: no-null-keyword
    const system = infrastructureSystem || null;
    return Promise.all(
      devices.map(async (deviceId: string) => {
        // tslint:disable-next-line: no-null-keyword
        return await this.deviceManagerService.updateDevice(deviceId, { station: null, system } as Device, current);
      })
    );
  }

  async processStationRemove(station: Station, current: Current): Promise<void> {
    if (station.type === StationType.WORK) {
      await this.deviceManagerService.removeSystem(station.system, current);
      await this.systemGraphService.removeStation(station._id, current);
    }
    await this.remove(station._id);
  }

}
