import { Inject, Service } from 'typedi';
import { GraphsApi, SubgraphCreation, DevicesToSubgraph, RemoveDevice, Graph } from '@aitheon/system-graph-server';
import { Current } from '@aitheon/core-server';
import { DevicesFromStation } from '@aitheon/system-graph-server/dist/model/devicesFromStation';
import { ControllerFromOrg } from '@aitheon/system-graph-server/dist/model/controllerFromOrg';
import { ControllerToSubgraph } from '@aitheon/system-graph-server/dist/model/controllerToSubgraph';
import { Device } from '@aitheon/device-manager-server';



@Service()
export class SystemGraphService {

  graphsApi: GraphsApi;

  constructor() {
    // this.graphsApi = new GraphsApi(`http://localhost:3001`);
    this.graphsApi = new GraphsApi(`https://${process.env.DOMAIN || 'dev.aitheon.com'}/system-graph`);
  }

  async createInfrastructureSubGraph(name: string, reference: string, current: Current) {
    await this.graphsApi.createInfrastructureSubgraph(
      { name, reference },
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async createFloorSubGraph(name: string, reference: any, infrastructure: string, current: Current) {
    await this.graphsApi.createFloorSubgraph(
      { name, reference, infrastructure },
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async removeStation(stationId: string, current: Current) {
    await this.graphsApi.removeStationSubGraph(
      stationId,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async removeFloor(floorId: string, current: Current) {
    await this.graphsApi.removeFloorSubGraph(
      floorId,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async removeInfrastructure(infrastructureId: string, current: Current) {
    await this.graphsApi.removeInfrastructureSubGraph(
      infrastructureId,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async createStationSubGraph(name: string, reference: any, infrastructure: string, controller: Device, isNewController: boolean, current: Current) {
    const body = { name, reference, infrastructure, isNewController } as SubgraphCreation;
    if (controller._id) {
      body.controller = controller;
    }
    await this.graphsApi.createStationSubgraph(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async addStationToFloor(infrastructureId: string, floorId: any, stationId: string, name: string, current: Current) {
    const body = { infrastructureId, floorId, stationId, name };
    await this.graphsApi.addStationToFloor(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async addDeviceToSubgraph(device: any, reference: string, current: Current) {
    const body = { device, reference } as DevicesToSubgraph;

    await this.graphsApi.addDeviceToSubgraph(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async addControllerToSubgraph(controller: any, devices: any, reference: string, current: Current) {
    const body = { devices, reference, controller } as ControllerToSubgraph;

    await this.graphsApi.addControllerToSubgraph(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async removeControllerFromInfrastructure(controllerId: string, infrastructureId: string, stationId: string, current: Current) {
    const body = { controllerId, infrastructureId, stationId } as DevicesFromStation;
    await this.graphsApi.removeController(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async removeControllerFromOrg(controllerId: string, reference: string, current: Current) {
    const body = { controllerId, reference } as ControllerFromOrg;
    await this.graphsApi.removeControllerFromOrg(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async removeDevice(device: string, subType: any, reference: string, current: Current, infrastructure: string = '') {
    const body = { subType, device, reference, infrastructure } as RemoveDevice;
    await this.graphsApi.removeDevice(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
  }

  async getGraphBySearch(reference: string, current: Current): Promise<Graph> {
    const body = { reference, subType: Graph.SubTypeEnum.INFRASTRUCTURE };
    return (await this.graphsApi.getBySearch(
      body,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

  async updateGraph(graphId: string, updateDocument: any, current: Current): Promise<Graph> {
    const body = updateDocument;
    return (await this.graphsApi.update(
      graphId,
      body,
      false,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      })).body;
  }

}
