import { Get, Post, Delete, Put, Patch, Body, Param, Res, Req, JsonController, Authorized, CurrentUser, QueryParam, QueryParams, UseAfter, UseBefore } from 'routing-controllers';
import { Inject } from 'typedi';
import { InfrastructureTasksService } from './infrastructure-tasks.service';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { InfrastructureTask, GetTasksQuery, MapOverlay, ActivityFilter } from './infrastructure-task.model';
import { Current, logger } from '@aitheon/core-server';
import { Request, Response } from 'express';
import { DeviceManagerService } from '../shared/services/device-manager.service';
import { DeviceSummary } from '../shared/models/device.model';
import { InfrastructureService } from '../infrastructures/infrastructure.service';


@Authorized()
@JsonController('/api/tasks')
export class InfrastructureTasksController {

  @Inject()
  infrastructureTasksService: InfrastructureTasksService;

  @Inject()
  deviceManagerService: DeviceManagerService;

  @Inject(() => InfrastructureService)
  infrastructureService: InfrastructureService;

  @Get('/')
  @OpenAPI({ summary: 'List infrastructure tasks by query', operationId: 'list' })
  @ResponseSchema(InfrastructureTask, { isArray: true })
  async list(
    @CurrentUser() current: Current,
    @QueryParam('assignedToDevice') assignedToDevice: string,
    @QueryParam('infrastructure') infrastructure: string,
    @QueryParam('isScheduled') isScheduled: boolean,
    @QueryParam('isHistory') isHistory: boolean,
    @QueryParam('populateFloor') populateFloor: boolean,
    // @QueryParams() query: GetTasksQuery,
    @Res() response: Response,
    @Req() request: Request) {
    try {
      const query = {
        assignedToDevice,
        infrastructure,
        isScheduled,
        isHistory
      } as GetTasksQuery;
      let tasks = await this.infrastructureTasksService.listByQuery(query, current.organization._id);

      if (populateFloor) {
        const allFloorIdsSet = new Set();
        tasks.forEach((task: InfrastructureTask) => allFloorIdsSet.add(task.floor.toString()));
        const floors = await Promise.all(Array.from(allFloorIdsSet).map(async (floorId: string) => {
          return await this.infrastructureService.getFloorById(floorId);
        }));
        tasks = tasks.map((t: InfrastructureTask) => {
          return {
            ...t,
            floor: floors.find(f => t.floor && f._id.toString() === t.floor.toString())
          };
        });
      }

      return response.json(tasks);
    } catch (err) {
      logger.error('[InfrastructureTasksController.list]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }


  @Get('/infrastructure/:infrastructureId')
  @OpenAPI({ summary: 'List by infrastructure', operationId: 'listByInfrastructure' })
  @ResponseSchema(InfrastructureTask, { isArray: true })
  async listByInfrastructure(@CurrentUser() current: Current,
    @Param('infrastructureId') infrastructureId: string,
    @Res() response: Response,
    @Req() request: Request) {
    try {
      const tasks = await this.infrastructureTasksService.listByInfrastructure(infrastructureId, current.organization._id);
      return response.json(tasks);
    } catch (err) {
      logger.error('[InfrastructureTasksController.listByInfrastructure]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/')
  @OpenAPI({ summary: 'Create infrastructure tasks', operationId: 'create' })
  @ResponseSchema(InfrastructureTask)
  async create(@CurrentUser() current: Current, @Body() body: InfrastructureTask, @Res() response: Response, @Req() request: Request) {
    try {
      const orchestratorTask = await this.infrastructureTasksService.createOrchestratorTask(body, current);
      const task = await this.infrastructureTasksService.createInfrastructureTask(body, orchestratorTask, current.organization._id);
      return response.json(task);
    } catch (err) {
      logger.error('[InfrastructureTasksController.create]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/map/overlay')
  @OpenAPI({ summary: 'Create infrastructure tasks', operationId: 'changeMapOverlay' })
  @ResponseSchema(DeviceSummary, { description: 'DeviceSummary'})
  async changeMapOverlay(@CurrentUser() current: Current, @Body() body: MapOverlay, @Res() response: Response, @Req() request: Request) {
    try {
      await this.infrastructureTasksService.updateMapOverlay(body, current.organization._id);
      return response.json({ deviceId: body.deviceId });
    } catch (err) {
      logger.error('[InfrastructureTasksController.changeMapOverlay]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/filters/activity')
  @OpenAPI({ summary: 'Get tasks activity by filter', operationId: 'getFilterTaskActivity' })
  @ResponseSchema(InfrastructureTask, { isArray: true })
  async getFilterTaskActivity(@CurrentUser() current: Current, @Body() filter: ActivityFilter, @Res() response: Response, @Req() request: Request) {
    try {
      filter.organization = current.organization._id;
      const tasks = await this.infrastructureTasksService.getFilteredActivity(filter);
      return response.json(tasks);
    } catch (err) {
      logger.error('[InfrastructureTasksController.getFilterTaskActivity]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/device/:deviceId/fetch')
  @OpenAPI({ summary: 'Get relevant task for device', operationId: 'getTaskForDevice' })
  @ResponseSchema(InfrastructureTask)
  async getTaskForDevice(@CurrentUser() current: Current, @Param('deviceId') deviceId: string, @Res() response: Response, @Req() request: Request) {
    try {
      const device = await this.deviceManagerService.getDeviceById(deviceId, current);
      const task = await this.infrastructureTasksService.findTaskForDevice(device);

      if (!task) {
        return response.status(404).json({ message: 'No task available' });
      }

      if (task && !task.orchestratorTask.assignedToDevice) {
        await this.infrastructureTasksService.assignTaskToDevice(deviceId, task.orchestratorTask._id, current);
        task.orchestratorTask.assignedToDevice = deviceId;
      }

      return response.json(task);
    } catch (err) {
      logger.error('[InfrastructureTasksController.getTaskForDevice]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }


  @Patch('/task/:taskId')
  @OpenAPI({ summary: 'Update a task', operationId: 'update' })
  @ResponseSchema(InfrastructureTask)
  async update(@CurrentUser() current: Current, @Param('taskId') taskId: string, @Res() response: Response, @Req() request: Request, @Body() body: any ) {
    try {
      const task = await this.infrastructureTasksService.update(taskId, body);
      return response.json(task);
    } catch (err) {
      logger.error('[InfrastructureTasksController.update]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/priority/update')
  @OpenAPI({ summary: 'Update Infrastructure Tasks Priority', operationId: 'updatePriority' })
  async createOrder(@CurrentUser() current: Current, @Res() response: Response, @Req() request: Request, @Body() body: { tasks: string[] }) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const priorities = await this.infrastructureTasksService.updatePriorities(body.tasks, current);
      return response.json(priorities);
    } catch (err) {
      logger.error('[InfrastructureTasksController]: Could not update tasks priorities', err);
      return response.status(400).send({ message: 'Could not update tasks priorities' });
    }
  }

}
