import { Get, Post, Delete, Put, Body, Param, Res, Req, JsonController, Authorized, CurrentUser, QueryParam } from 'routing-controllers';
import { Inject } from 'typedi';
import { InfrastructureService } from './infrastructure.service';
import { Infrastructure, Floor, GraphReference, GraphReferenceType } from './infrastructure.model';
import { Request, Response } from 'express';
import { Current, logger } from '@aitheon/core-server';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { DeviceManagerService } from '../shared/services/device-manager.service';
import { UsersService } from '../shared/services/users.service';
import { Device, Translation, System, DeviceSearch } from '@aitheon/device-manager-server';
import { InfrastructureTasksService } from '../infrastructure-tasks/infrastructure-tasks.service';
import { ObjectId } from 'bson';
import { FileModel } from '@aitheon/orchestrator-server';
import { SystemGraphService } from '../shared/services/system-graph.service';
import { StationsService } from '../stations/stations.service';
import { DeviceSummary } from '../shared/models/device.model';
import { Types } from 'mongoose';

@Authorized()
@JsonController('/api/infrastructures')
export class InfrastructureController {

  constructor() { }

  @Inject()
  infrastructureService: InfrastructureService;

  @Inject()
  infrastructureTasksService: InfrastructureTasksService;

  @Inject()
  deviceManagerService: DeviceManagerService;

  @Inject()
  usersService: UsersService;

  @Inject()
  systemGraphService: SystemGraphService;

  @Inject()
  stationsService: StationsService;


  @Get('/')
  @OpenAPI({ summary: 'List of infrastructure by organizationId', operationId: 'list' })
  @ResponseSchema(Infrastructure, { isArray: true })
  async list(@CurrentUser() current: Current, @Res() response: Response, @Req() request: Request, @QueryParam('searchText') searchText: string, @QueryParam('includeArchived') includeArchived: boolean) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const org = await this.usersService.getOrgById(current);

      const result = await this.infrastructureService.findByOrg(org, searchText, includeArchived);

      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.list]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/')
  @OpenAPI({ summary: 'Create infrastructure', operationId: 'create' })
  @ResponseSchema(Infrastructure)
  async create(@CurrentUser() current: Current, @Body() infrastructure: Infrastructure, @Res() response: Response) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      infrastructure.organization = current.organization._id;
      infrastructure.createdBy = current.user._id;
      infrastructure.system = await this.deviceManagerService.createSystem(infrastructure.name, System.ReferenceTypeEnum.INFRASTRUCTURE, current);
      infrastructure.location = infrastructure.location._id || await this.usersService.addLocationToOrg(infrastructure.location, current, infrastructure.type);

      const result = await this.infrastructureService.create(infrastructure);
      this.systemGraphService.createInfrastructureSubGraph(result.name, result._id, current);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.create]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Get infrastructure by id', operationId: 'getById' })
  @ResponseSchema(Infrastructure)
  async getById(@Param('id') id: string, @Res() response: Response) {
    try {
      const result = await this.infrastructureService.findById(id);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.getById]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id')
  @ResponseSchema(Infrastructure)
  @OpenAPI({ description: 'Update infrastructure by id', operationId: 'update' })
  async update(@CurrentUser() current: Current, @Param('id') id: string, @Body() infrastructure: Infrastructure, @Res() response: Response) {
    try {
      if (infrastructure.location) {
        await this.usersService.updateLocation(infrastructure.location, current);
      }

      const result = await this.infrastructureService.update(id, infrastructure);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.update]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id/archive')
  @OpenAPI({ description: 'Archive infrastructure by id', operationId: 'archive' })
  async archive(@CurrentUser() current: Current, @Param('id') id: string, @Res() response: Response) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return response.status(422).json({ message: 'Id of infrastructure is not valid.' });
      }

      const infrastructure = await this.infrastructureService.findById(id);
      if (!infrastructure) {
        return response.status(422).json({ message: 'No such infrastructure.' });
      }

      await this.infrastructureService.archive(id, current);
      return response.sendStatus(204);
    } catch (err) {
      logger.error('[InfrastructureController.update]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Delete('/:id')
  @OpenAPI({ description: 'Remove infrastructure by id', operationId: 'remove' })
  async remove(@CurrentUser() current: Current, @Param('id') id: string, @Res() response: Response) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return response.status(422).json({ message: 'Id of infrastructure is not valid.' });
      }

      const infrastructure = await this.infrastructureService.findById(id);
      if (!infrastructure) {
        return response.status(422).json({ message: 'No such infrastructure.' });
      }

      await this.infrastructureService.processRemoveInfrastructure(infrastructure, current);
      return response.sendStatus(204);
    } catch (err) {
      logger.error('[InfrastructureController.remove]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/devices/search')
  @OpenAPI({ summary: 'Filter devices', operationId: 'searchDevices' })
  @ResponseSchema(Device, { isArray: true })
  async searchDevices(@CurrentUser() current: Current, @Body() filter: DeviceSearch, @Res() response: Response) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const result = await this.deviceManagerService.deviceSearch(filter, current);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.searchDevices]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/devices/:id')
  @OpenAPI({ summary: 'Get Device By Id', operationId: 'getDeviceById' })
  @ResponseSchema(Device)
  async getDeviceById(@CurrentUser() current: Current, @Res() response: Response, @Param('id') id: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const result = await this.deviceManagerService.getDeviceById(id, current);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.getDeviceById]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/devices/:id/image')
  @OpenAPI({ summary: 'Edit Device Image', operationId: 'editDeviceImage' })
  @ResponseSchema(Device)
  async editDeviceImage(@CurrentUser() current: Current, @Res() response: Response, @Param('id') id: string, @Body() image: FileModel) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const result = await this.deviceManagerService.updateDevice(id, { image } as Device, current);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.editDeviceImage]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Delete('/devices/:id')
  @OpenAPI({ summary: 'Delete Device By Id', operationId: 'deleteDevice' })
  async deleteDevice(@CurrentUser() current: Current, @Res() response: Response, @Param('id') deviceId: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }
      const device = await this.deviceManagerService.getDeviceById(deviceId, current);
      if (!device) {
        return response.status(403).send({ message: 'No device with such id' });
      }

      await this.infrastructureService.removeDevice(device, current);
      return response.sendStatus(204);
    } catch (err) {
      logger.error('[InfrastructureController.deleteDevice]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/devices')
  @OpenAPI({ summary: 'Create device', operationId: 'createDevice' })
  @ResponseSchema(Device)
  async createDevice(@CurrentUser() current: Current, @Res() response: Response, @Body() body: Device) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }
      const defaultTask = body.defaultTask as any;
      if (defaultTask && defaultTask.defaultTaskType) {
        // Generate ID for default Task
        const newTaskId = new ObjectId();
        defaultTask.newTaskId = newTaskId;
        body.defaultTask = newTaskId;
      }

      const result = await this.deviceManagerService.createDevice(body.system, body, current);

      if (defaultTask && defaultTask.defaultTaskType) {
        const newDefaultTask = await this.infrastructureTasksService.createInfrastructureTaskFromDevice(result, current, defaultTask);
        result.defaultTask = newDefaultTask._id;
      }

      const reference = result.controller || result.station || result.floor || result.infrastructure;
      result.isController ? await this.systemGraphService.addControllerToSubgraph(result, [], reference, current) :
                            await this.systemGraphService.addDeviceToSubgraph(result, reference, current);

      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.createDevice]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/devices/not-aos-device')
  @OpenAPI({ summary: 'Create not aos device', operationId: 'createNotAosDevice' })
  @ResponseSchema(Device)
  async createNotAosDevice(@CurrentUser() current: Current, @Res() response: Response, @Body() body: Device) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }
      const result = await this.deviceManagerService.createDevice(body.system, body, current);
      const reference = body.controller || body.station || body.infrastructure;

      if (body.station) {
        // Add devices to station SYSTEM
        await this.stationsService.addDevices(body.station, [result._id], current);
      }
      // Add devices to referenced subgraph
      await this.systemGraphService.addDeviceToSubgraph(result, reference, current);

      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.createNotAosDevice]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/devices/station/add')
  @OpenAPI({ summary: 'Add device to a station or controller', operationId: 'addDevice' })
  @ResponseSchema(Device)
  async addDevice(@CurrentUser() current: Current, @Res() response: Response, @Body() body: Device, @QueryParam('fromExisting') fromExisting: boolean) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }
      const deviceToAdd = fromExisting ? await this.deviceManagerService.updateDevice(body._id, body, current) :
                                         await this.deviceManagerService.createDevice(body.system, body, current);
      let linkedDevices = [] as Device[];

      if (body.isController) {
        linkedDevices = await this.deviceManagerService.getLinkedDevices(deviceToAdd._id, current);
      }

      if (body.station) {
        await this.stationsService.addDevices(body.station, [deviceToAdd._id, ...linkedDevices.map(d => d._id)], current);
      }

      const reference = body.controller || body.station || body.infrastructure;

      body.isController ? await this.systemGraphService.addControllerToSubgraph(deviceToAdd, linkedDevices, reference, current) :
                          await this.systemGraphService.addDeviceToSubgraph(deviceToAdd, reference, current);

      return response.json(deviceToAdd);
    } catch (err) {
      logger.error('[InfrastructureController.addDevice]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/devices/:id')
  @OpenAPI({ summary: 'Update', operationId: 'updateDevice' })
  @ResponseSchema(Device)
  async updateDevice(@CurrentUser() current: Current, @Res() response: Response, @Body() body: Device, @Param('id') id: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const result = await this.deviceManagerService.updateDevice(id, body, current);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.updateDevice]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }


  @Get('/floors/:floorId')
  @OpenAPI({ description: 'Get floor by id', operationId: 'getFloorById' })
  @ResponseSchema(Floor)
  async getFloorById(@CurrentUser() current: Current, @Res() response: Response, @Param('floorId') floorId: string) {
    try {
      const result = await this.infrastructureService.getFloorById(floorId);
      return response.json(result);
    } catch (err) {
      logger.error('[Get floor by id]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/floors/:floorId/map')
  @OpenAPI({ description: 'Upload floor map for robot', operationId: 'uploadFloorMap' })
  async uploadFloorMap(@CurrentUser() current: Current, @Res() response: Response, @Param('floorId') floorId: string) {
    try {
      const bufferResult = await this.infrastructureService.uploadMap(floorId);
      const result = [...bufferResult];
      return response.json(result);
    } catch (err) {
      logger.error('[Upload floor map for robot]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/floors/:floorId/scale')
  @OpenAPI({ description: 'Get scale for floor map', operationId: 'getFloorMapScale' })
  async getFloorMapScale(@CurrentUser() current: Current, @Res() response: Response, @Param('floorId') floorId: string) {
    try {
      const floor = await this.infrastructureService.getFloorById(floorId);

      if (!floor) {
        return response.status(403).send({ message: 'Wrong floor ID provided.' });
      }

      if (!floor.pixelScale) {
        return response.status(403).send({ message: 'Broken Floor model. Scale was not set.' });
      }

      return response.json(floor.pixelScale);
    } catch (err) {
      logger.error('[Get scale]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/:infrastructureId/floors')
  @OpenAPI({ summary: 'Add floor', operationId: 'createFloor' })
  @ResponseSchema(Infrastructure)
  async createFloor(@CurrentUser() current: Current, @Res() response: Response, @Body() floor: Floor, @Param('infrastructureId') infrastructureId: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const floorId = new ObjectId();
      floor._id = floorId;
      const infrastructure = await this.infrastructureService.findById(infrastructureId);
      floor.system = await this.deviceManagerService.createSystem(floor.name, System.ReferenceTypeEnum.FLOOR, current, infrastructure.system);
      const result = await this.infrastructureService.addFloor(infrastructureId, floor);
      await this.systemGraphService.createFloorSubGraph(floor.name, floorId, infrastructureId, current);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.createFloor]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:infrastructureId/floors')
  @OpenAPI({ summary: 'Update floor', operationId: 'updateFloor' })
  @ResponseSchema(Infrastructure)
  async updateFloor(@CurrentUser() current: Current, @Res() response: Response, @Body() floor: Floor, @Param('infrastructureId') infrastructureId: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const result = await this.infrastructureService.updateFloor(infrastructureId, floor);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.updateFloor]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/devices/:deviceId/change-position')
  @OpenAPI({ summary: 'Change position of a device', operationId: 'changePosition' })
  @ResponseSchema(DeviceSummary, { description: 'DeviceSummary'})
  async changePosition(@CurrentUser() current: Current, @Res() response: Response, @Body() position: Translation, @Param('deviceId') deviceId: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      await this.deviceManagerService.changeDevicePosition(deviceId, position, current.organization._id);
      return response.json({ deviceId });
    } catch (err) {
      logger.error('[InfrastructureController.changePosition]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/devices/controllers/organization')
  @OpenAPI({ summary: 'Get all free controllers from organization', operationId: 'getFreeOrgControllers' })
  @ResponseSchema(Device, { description: 'Devices', isArray: true })
  async getFreeOrgControllers(@CurrentUser() current: Current, @Res() response: Response) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const devices = await this.deviceManagerService.getControllers(current.organization._id);
      return response.json(devices);
    } catch (err) {
      logger.error('[InfrastructureController.changePosition]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/devices/by/controller/:controllerId')
  @OpenAPI({ summary: 'Get all free devices from controller', operationId: 'getFreeDevicesLinkToController' })
  @ResponseSchema(Device, { description: 'Devices', isArray: true })
  async getFreeDevicesLinkToController(@CurrentUser() current: Current, @Res() response: Response, @Param('controllerId') controllerId: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const devices = await this.deviceManagerService.deviceSearch({ controller: controllerId } as DeviceSearch, current);
      return response.json(devices);
    } catch (err) {
      logger.error('[InfrastructureController.getFreeDevicesLinkToController]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/graph/references/:type')
  @OpenAPI({ summary: 'Get entities for system-graph by reference', operationId: 'listGraphReferences' })
  @ResponseSchema(GraphReference)
  async listGraphReferences(@CurrentUser() current: Current, @Res() response: Response, @Param('type') type: GraphReferenceType, @QueryParam('referenceId') referenceId: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const result = await this.infrastructureService.getReferences(current.organization._id, type, referenceId);
      return response.json(result);
    } catch (err) {
      logger.error('[InfrastructureController.listGraphReferences]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

}
