import Container, { Service, Inject } from 'typedi';
import { InfrastructureSchema, Infrastructure, IInfrastructure, InfrastructureStatus, Floor, GraphReferenceType, GraphReference } from './infrastructure.model';
import { Transporter, TransporterService, Action } from '@aitheon/transporter';
import '../shared/models/organization.model';
import '../shared/models/system.model';
import '../shared/models/item.model';
import { StationSchema, Station } from '../stations/station.model';
import { DeviceSchema } from '../shared/models/device.model';
import axios, { AxiosRequestConfig } from 'axios';
import { SystemGraphService } from '../shared/services/system-graph.service';
import { Current } from '@aitheon/core-server';
import { StationsService } from '../stations/stations.service';
import { DeviceManagerService } from '../shared/services/device-manager.service';
import { Device } from '@aitheon/device-manager-server';
import { Graph } from '@aitheon/system-graph-server';
import { AreasService } from '../areas/areas.service';
import { InfrastructureTasksService } from '../infrastructure-tasks/infrastructure-tasks.service';
import { InfrastructureTask, InfrastructureTaskSchema } from '../infrastructure-tasks/infrastructure-task.model';
import { TaskSchema } from '../shared/models/task.model';
import { Area } from '../areas/area.model';


@Service()
@Transporter()
export class InfrastructureService extends TransporterService {

  @Inject(() => SystemGraphService)
  systemGraphService: SystemGraphService;

  @Inject(() => StationsService)
  stationsService: StationsService;

  @Inject(() => DeviceManagerService)
  deviceManagerService: DeviceManagerService;

  @Inject(() => AreasService)
  areasService: AreasService;

  @Inject(() => InfrastructureTasksService)
  infrastructureTasksService: InfrastructureTasksService;

  constructor() {
    super(Container.get('TransporterBroker'));
  }

  @Action()
  async findAll(): Promise<Infrastructure[]> {
    return InfrastructureSchema.find({ status: InfrastructureStatus.ACTIVE }).populate('items');
  }

  async findByOrg(organization: any, searchText: string, includeArchived: boolean = false): Promise<Infrastructure[]> {
    const statuses = includeArchived ? [InfrastructureStatus.ACTIVE, InfrastructureStatus.ARCHIVED] : [InfrastructureStatus.ACTIVE];
    const query = {
      organization: organization._id,
      status: { $in: statuses }
    } as any;
    if (searchText) {
      query.name = { $regex: `${searchText}`, $options: 'i' };
    }
    const infrastructures = await InfrastructureSchema.find(query).populate('items').lean();

    const result = infrastructures.map((infra: Infrastructure) => {
      return {
        ...infra,
        location: organization.locations.find((l: any) => l._id.toString() == infra.location.toString())
      };
    });

    return result;
  }

  async create(infrastructure: Infrastructure): Promise<Infrastructure> {
    return InfrastructureSchema.create(infrastructure);
  }

  async update(id: any, infrastructure: Infrastructure): Promise<Infrastructure> {
    return InfrastructureSchema.findByIdAndUpdate(id, infrastructure, { new: true }).populate('items').lean();
  }

  async archive(id: any, current: Current): Promise<Infrastructure> {
    const graph = await this.systemGraphService.getGraphBySearch(id, current);
    if (graph) {
      await this.systemGraphService.updateGraph(graph._id, { disabled: true } as any, current);
    }
    return await InfrastructureSchema.findByIdAndUpdate(id, { status: InfrastructureStatus.ARCHIVED }, { new: true }).populate('items').lean();
  }

  async findById(infrastructureId: string): Promise<Infrastructure> {
    return InfrastructureSchema.findById(infrastructureId).populate('system').populate('items').lean();
  }

  async remove(infrastructureId: string): Promise<Infrastructure> {
    return InfrastructureSchema.findByIdAndRemove(infrastructureId);
  }

  async removeDevice(device: Device, current: Current): Promise<void> {
    const reference = device.controller || device.station || device.floor || device.infrastructure;
    let subType = Graph.SubTypeEnum.INFRASTRUCTURE;
    if (device.controller) {
      subType = Graph.SubTypeEnum.CONTROLLER;
    } else if (device.station) {
      subType = Graph.SubTypeEnum.STATION;
    } else if (device.floor) {
      subType = Graph.SubTypeEnum.FLOOR;
    }

    device.isController ? this.systemGraphService.removeControllerFromOrg(device._id, reference, current) :
                          this.systemGraphService.removeDevice(device._id, subType, reference, current, device.infrastructure);

    if (device.isController || device.type.name === 'ROBOT') {
      const linkedDevices = await this.deviceManagerService.getLinkedDevices(device._id, current) || [];
      await this.deviceManagerService.removeDeviceFromOrg(device._id, current);
      if (linkedDevices.length) {
        await this.deviceManagerService.deleteDevices(linkedDevices.map(d => d._id), current);
      }
    } else {
      await this.deviceManagerService.deleteDevice(device._id, current);
    }
  }

  async processRemoveInfrastructure(infrastructure: Infrastructure, current: Current): Promise<void> {
    // Querying all entities for infrastructure
    const [ floors, stations, areas, devices, tasks ] = await Promise.all([
      Promise.resolve(infrastructure.floors),
      this.listInfraStations(infrastructure._id),
      this.areasService.listByQuery({ infrastructure: infrastructure._id }),
      this.deviceManagerService.deviceSearch({ infrastructure: infrastructure._id }, current),
      this.infrastructureTasksService.listByInfrastructure(infrastructure._id, current.organization._id),
    ]);
    const controllers = devices.filter(d => d.isController);
    const controllersIds = controllers.map(({ _id }) => _id);
    const notLinkedDevices = devices.filter(({ controller }) => !controllersIds.includes(controller));

    try {
      await Promise.all([
        this.processRemoveInfraTasks(tasks),
        this.processRemoveDevices(notLinkedDevices, current),
        this.processRemoveAreas(areas),
        this.processRemoveStations(stations, current),
        this.processRemoveFloors(floors, current),
        this.removeInfrastructure(infrastructure, current)
      ]);
    } catch (err) {
      console.error(JSON.stringify(err.message || err));
    }

  }

  async processRemoveInfraTasks(infrastructureTasks: InfrastructureTask[]): Promise<void> {
    const orchestratorTasksIds = infrastructureTasks.map((t: InfrastructureTask) => t.orchestratorTask._id);
    const infrastructureTasksIds = infrastructureTasks.map((t: InfrastructureTask) => t._id);
    await TaskSchema.deleteMany({ _id: { $in: orchestratorTasksIds }});
    await InfrastructureTaskSchema.deleteMany({ _id: { $in: infrastructureTasksIds }});
  }

  async processRemoveDevices(devices: Device[], current: Current): Promise<void> {
    await Promise.all(devices.map(async (device: Device) => {
      await this.removeDevice(device, current);
    }));
  }

  async processRemoveAreas(areas: Area[]): Promise<void> {
    await this.areasService.removeByIds(areas.map(({ _id }) => _id));
  }

  async processRemoveStations(stations: Station[], current: Current): Promise<void> {
    await Promise.all(stations.map(async (station: Station) => {
      await this.stationsService.processStationRemove(station, current);
    }));
  }

  async processRemoveFloors(floors: Floor[], current: Current): Promise<void> {
    await Promise.all(floors.map(async (floor: Floor) => {
      await this.removeFloor(floor, current);
    }));
  }

  async listInfraStations(infrastructureId: string) {
    return await this.stationsService.listByQuery({ infrastructure: infrastructureId });
  }

  async addFloor(infrastructureId: string, floor: Floor): Promise<Infrastructure> {
    return InfrastructureSchema.findByIdAndUpdate(infrastructureId, { $push: { floors: floor } }, { new: true });
  }

  async removeFloor(floor: Floor, current: Current): Promise<void> {
    await this.deviceManagerService.removeSystem(floor.system, current);
    await this.removeFloorFromInfrastructure(floor);
    await this.systemGraphService.removeFloor(floor._id, current);
  }

  async removeInfrastructure(infrastructure: Infrastructure, current: Current): Promise<void> {
    await this.deviceManagerService.removeSystem(infrastructure.system._id || infrastructure.system, current);
    await this.remove(infrastructure._id);
    await this.systemGraphService.removeInfrastructure(infrastructure._id, current);
  }

  async removeFloorFromInfrastructure(floor: Floor) {
    await InfrastructureSchema.findOneAndUpdate({ 'floors._id': floor._id }, { $pull: { floors: { _id: floor._id } }});
  }

  async getReferences(organizationId: string, type: GraphReferenceType, reference: string): Promise<GraphReference> {
    let result = {} as GraphReference;
    switch (type) {
      case GraphReferenceType.SERVICE:
        result = await this.getServiceReferences(organizationId);
        break;
      case GraphReferenceType.INFRASTRUCTURE:
        result = await this.getInfrastructureReferences(reference);
        break;
      case GraphReferenceType.FLOOR:
        result = await this.getFloorReferences(reference);
        break;
      case GraphReferenceType.STATION:
        result = await this.getStationReferences(reference);
        break;
    }
    return result;
  }

  async getServiceReferences(organizationId: string): Promise<GraphReference> {
    const infrastructures = await InfrastructureSchema.find({ organization: organizationId }).select('_id name').lean();
    return { infrastructures } as GraphReference;
  }

  async getInfrastructureReferences(infrastructureId: string): Promise<GraphReference> {
    const infrastructure = await this.findById(infrastructureId);
    const floors = infrastructure.floors as any[];
    // tslint:disable-next-line: no-null-keyword
    const stations = await StationSchema.find({ infrastructure: infrastructureId, floor: { $eq: null } }).select('_id name').lean();
    // tslint:disable-next-line: no-null-keyword
    const devices = await DeviceSchema.find({ infrastructure: infrastructureId, floor: { $eq: null }, station: { $eq: null } }).select('_id name').lean();
    return { floors, stations, devices } as GraphReference;
  }

  async getFloorReferences(floorId: string): Promise<GraphReference> {
    const stations = await StationSchema.find({ floor: floorId }).select('_id name').lean();
    // tslint:disable-next-line: no-null-keyword
    const devices = await DeviceSchema.find({ floor: floorId, station: { $eq: null } }).select('_id name').lean();
    return { stations, devices } as GraphReference;
  }

  async getFloorById(floorId: string): Promise<Floor> {
    const infrastructure = await InfrastructureSchema.findOne({ 'floors._id': floorId }).lean();
    return infrastructure.floors.find((floor: Floor) => floor._id.toString() === floorId);
  }

  async uploadMap(floorId: string): Promise<Buffer> {
    const floor = await this.getFloorById(floorId);
    const imageFile = floor.uploadedFile;
    const { signedUrl } = imageFile;
    return await this.getFileByUrl(signedUrl);
  }

  async getFileByUrl(signedUrl: string) {
    try {
      const options = {
        responseType: 'arraybuffer'
      } as AxiosRequestConfig;
      const result = await axios.get(signedUrl, options);
      return result.data;
    } catch (err) {
      console.error(err.response);
    }
  }

  async getStationReferences(stationId: string): Promise<GraphReference> {
    // tslint:disable-next-line: no-null-keyword
    const devices = await DeviceSchema.find({ station: stationId }).select('_id name').lean();
    return { devices } as GraphReference;
  }

  async updateFloor(infrastructureId: string, floor: Floor): Promise<Infrastructure> {
    return InfrastructureSchema.findOneAndUpdate({ '_id': infrastructureId, 'floors._id': floor._id },
      {
        $set: {
          'floors.$.name': floor.name,
          'floors.$.number': floor.number,
          'floors.$.status': floor.status,
          'floors.$.uploadedFile': floor.uploadedFile,
          'floors.$.pixelScale': floor.pixelScale
        }
      }, { new: true });
  }
}
