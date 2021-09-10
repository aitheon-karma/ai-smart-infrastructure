import { Get, Post, Delete, Put, Body, Param, Res, Req, JsonController, Authorized, CurrentUser, Params, QueryParam } from 'routing-controllers';
import { Inject, Container } from 'typedi';
import { Request, Response } from 'express';
import { Current, logger } from '@aitheon/core-server';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Station, StationType } from './station.model';
import { StationsService } from './stations.service';
import { DeviceManagerService } from '../shared/services/device-manager.service';
import { ObjectId } from 'bson';
import { Device, System, DeviceSearch } from '@aitheon/device-manager-server';
import { SystemGraphService } from '../shared/services/system-graph.service';
import { InfrastructureService } from '../infrastructures/infrastructure.service';
import { Floor } from '../infrastructures/infrastructure.model';


@Authorized()
@JsonController('/api/stations')
export class StationsController {

  constructor() { }

  @Inject(() => StationsService)
  stationsService: StationsService;

  @Inject(() => DeviceManagerService)
  deviceManagerService: DeviceManagerService;

  @Inject(() => SystemGraphService)
  systemGraphService: SystemGraphService;

  @Inject(() => InfrastructureService)
  infrastructureService: InfrastructureService;

  @Get('/')
  @OpenAPI({ summary: 'List of stations', operationId: 'list' })
  @ResponseSchema(Station, { isArray: true })
  async list(@CurrentUser() current: Current, @Res() response: Response, @Req() request: Request, @QueryParam('infrastructure') infrastructure: string, @QueryParam('floor') floor: string, @QueryParam('type') type: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const query = {
        infrastructure,
        floor,
        type
      };

      const result = await this.stationsService.listByQuery(query);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.list]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/')
  @OpenAPI({ summary: 'Create station', operationId: 'create' })
  @ResponseSchema(Station)
  async create(@CurrentUser() current: Current, @Body() station: Station, @Res() response: Response) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      station._id = new ObjectId();

      // TO_DO: Rework after DEMO (27.07.2020)
      if (station.type === StationType.WORK) {
        let newDevice = {} as Device;
        const isNewController = !!(!station.controller && station.controllerSerialNumber);

        if (isNewController) {
          const existingController = await this.deviceManagerService.getDeviceBySerialNumber(station.controllerSerialNumber);

          if (!existingController) {
            return response.status(403).send({ message: 'No device with such serial number registered' });
          }

          if (existingController.station || existingController.system) {
            return response.status(403).send({ message: 'This device is already linked to another system' });
          }

          if (existingController.organization) {
            return response.status(403).send({ message: 'This device is already linked to another organization' });
          }
          station.controller = existingController._id;
        }

        const systemId = await this.deviceManagerService.createSystem(station.name, System.ReferenceTypeEnum.STATION, current, station.parentSystem);

        station.system = systemId;
        newDevice = {
          organization: current.organization._id,
          station: station._id,
          system: station.system,
          infrastructure: station.infrastructure,
          _id: station.controller
        } as Device;
        if (isNewController) {
          newDevice.name = station.controllerName;
        }

        let updatedController = {} as any;
        if (station.controller) {
          updatedController = await this.deviceManagerService.updateDevice(newDevice._id, newDevice, current);
          delete station.controller;
          const linkedDevices = await this.deviceManagerService.getLinkedDevices(newDevice._id, current);
          if (linkedDevices && linkedDevices.length) {
            linkedDevices.forEach((d: Device) => {
              d.system = station.system;
              d.station = station._id;
              this.deviceManagerService.updateDevice(d._id, d, current);
            });
          }
        }

        await this.systemGraphService.createStationSubGraph(station.name, station._id, station.infrastructure, updatedController, isNewController, current);
      }
      const result = await this.stationsService.create(station);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.create]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Get station by id', operationId: 'getById' })
  @ResponseSchema(Station)
  async getById(@Param('id') id: string, @Res() response: Response) {
    try {
      const result = await this.stationsService.findById(id);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.getById]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id')
  @OpenAPI({ description: 'Update station by id', operationId: 'update' })
  @ResponseSchema(Station)
  async update(@CurrentUser() current: Current, @Param('id') id: string, @Body() station: Station, @Res() response: Response) {
    try {
      const result = await this.stationsService.update(id, station);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.update]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id/apps/add')
  @OpenAPI({ description: 'Update station by adding applications', operationId: 'addApps' })
  @ResponseSchema(Station)
  async addApps(@CurrentUser() current: Current, @Param('id') id: string, @Body() body: { applications: string[] }, @Res() response: Response) {
    try {
      const result = await this.stationsService.addApps(id, body.applications);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.addApps]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id/apps/remove')
  @OpenAPI({ description: 'Update station by removing applications', operationId: 'removeApps' })
  @ResponseSchema(Station)
  async removeApps(@CurrentUser() current: Current, @Param('id') id: string, @Body() body: { applications: string[] }, @Res() response: Response) {
    try {
      const result = await this.stationsService.removeApps(id, body.applications);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.removeApps]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/:stationId/devices')
  @OpenAPI({ description: 'Get devices by station', operationId: 'getDevicesByStation' })
  @ResponseSchema(Device, { isArray: true })
  async getDevicesByStation(@CurrentUser() current: Current, @Param('stationId') stationId: string, @Res() response: Response) {
    try {
      const result = await this.deviceManagerService.deviceSearch({ station: stationId } as DeviceSearch, current);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.getDevicesByStation]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id/controllers/unlink')
  @OpenAPI({ description: 'Update station by removing controller', operationId: 'unlinkController' })
  @ResponseSchema(Station)
  async unlinkController(@CurrentUser() current: Current, @Param('id') stationId: string, @Body() body: { controller: Device }, @Res() response: Response) {
    try {
      const { controller } = body;
      const infrastructure = await this.infrastructureService.findById(controller.infrastructure);
      const linkedDevices = await this.deviceManagerService.getLinkedDevices(controller._id, current) || [];
      await this.stationsService.removeDevices([controller._id, ...linkedDevices.map(d => d._id)], infrastructure.system, current);
      await this.systemGraphService.removeControllerFromInfrastructure(controller._id, controller.infrastructure, stationId, current);
      return response.sendStatus(204);
    } catch (err) {
      logger.error('[StationsController.unlinkController]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id/controllers/remove')
  @OpenAPI({ description: 'Update station by removing controller', operationId: 'removeController' })
  @ResponseSchema(Station)
  async removeController(@CurrentUser() current: Current, @Param('id') stationId: string, @Body() body: { controllerId: string, reference: string }, @Res() response: Response) {
    try {
      const { controllerId, reference } = body;
      const linkedDevices = await this.deviceManagerService.getLinkedDevices(controllerId, current) || [];
      await this.systemGraphService.removeControllerFromOrg(controllerId, reference, current);
      await this.deviceManagerService.removeDeviceFromOrg(controllerId, current);
      if (linkedDevices.length) {
        await this.deviceManagerService.deleteDevices(linkedDevices.map(d => d._id), current);
      }
      return response.sendStatus(204);
    } catch (err) {
      logger.error('[StationsController.removeDevices]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Delete('/:id')
  @OpenAPI({ description: 'Remove station by id', operationId: 'remove' })
  async remove(@CurrentUser() current: Current, @Param('id') id: string, @Res() response: Response) {
    try {
      const station = await this.stationsService.findById(id);
      const devices = await this.deviceManagerService.deviceSearch({ station: id} as DeviceSearch, current);

      if (devices && devices.length) {
        return response.status(403).send({ message: 'Station has linked devices. You need to unlink them first.' });
      }

      await this.stationsService.processStationRemove(station, current);

      return response.sendStatus(204);
    } catch (err) {
      logger.error('[StationsController.remove]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id/add/floor')
  @OpenAPI({ description: 'Link station to a map', operationId: 'putOnMap' })
  @ResponseSchema(Station)
  async putOnMap(@CurrentUser() current: Current, @Param('id') stationId: string, @Body() station: Station, @Res() response: Response) {
    try {
      const updates = { floor: station.floor, shape: { polygonPoints: station.shape.polygonPoints } } as Station;
      const result = await this.stationsService.update(stationId, updates);
      await this.deviceManagerService.addStationDevicesToFloor(station._id, station.floor);
      await this.systemGraphService.addStationToFloor(station.infrastructure, station.floor, stationId, station.name, current);
      const infrastructure = await this.infrastructureService.findById(station.infrastructure);
      const floor = infrastructure.floors.find((floor: Floor) => floor._id.toString() === station.floor.toString());
      await this.deviceManagerService.changeParentSystem(station.system, floor.system, current);
      return response.json(result);
    } catch (err) {
      logger.error('[StationsController.putOnMap]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }
}
