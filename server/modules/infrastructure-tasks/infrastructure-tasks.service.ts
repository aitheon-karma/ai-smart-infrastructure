import Container, { Service, Inject } from 'typedi';
import { TasksApi, Task } from '@aitheon/orchestrator-server';
import { TransporterService, Transporter, Event, Action } from '@aitheon/transporter';
import * as _ from 'lodash';
import {
  InfrastructureTask,
  InfrastructureTaskSchema,
  RecurringType,
  GetTasksQuery,
  infrastructureTaskDefaultQuery,
  InfrastructureTaskStatus,
  InfrastructureTaskType,
  MapOverlay,
  MAP_OVERLAY_STATUS_CODES,
  ActivityFilter
} from './infrastructure-task.model';
import { TaskSchema, FileModel } from '../shared/models/task.model';
import { Current, logger } from '@aitheon/core-server';
import { environment } from '../../environment';
import { ObjectId } from 'bson';
import { PushNotificationsService, PM_SI_ACTIONS } from '../shared/services/push-notifications.service';
import { PNG } from 'pngjs';
import { Stream } from 'stream';
import { DocumentSchema } from '../shared/models/document.model';
import * as path from 'path';
import { S3Manager } from '../core/s3-manager';
import { DeviceManagerService } from '../shared/services/device-manager.service';
import { UsersService } from '../shared/services/users.service';
import { intensity } from './intencity';
import { WebsocketService, WS_EVENTS } from '../core/websocket.service';
import { CreateRobotTask } from '../../sockets/SmartInfrastructure/createRobotTask';
import { AreasService } from '../areas/areas.service';
import { Device } from '@aitheon/device-manager-server';


@Service()
@Transporter()
export class InfrastructureTasksService extends TransporterService {

  @Inject(() => AreasService)
  areasService: AreasService;

  socketService: WebsocketService;

  deviceManagerService: DeviceManagerService;

  usersService: UsersService;

  tasksApi: TasksApi;

  pushNotificationsService: PushNotificationsService;
  s3Manager: S3Manager;

  constructor() {
    super(Container.get('TransporterBroker'));
    this.tasksApi = new TasksApi(`https://${process.env.DOMAIN || 'dev.aitheon.com'}/orchestrator`);
    this.pushNotificationsService = Container.get(PushNotificationsService);
    this.s3Manager = new S3Manager();
    this.usersService = Container.get(UsersService);
    this.deviceManagerService = Container.get(DeviceManagerService);
    this.socketService = Container.get(WebsocketService);
  }

  async listByQuery(payload: GetTasksQuery, organizationId: string): Promise<InfrastructureTask[]> {
    const query = { organization: new ObjectId(organizationId) } as any;

    if (payload.infrastructure) {
      query['infrastructure._id'] = new ObjectId(payload.infrastructure);
    }

    if (payload.assignedToDevice) {
      query['orchestratorTask.assignedToDevice._id'] = new ObjectId(payload.assignedToDevice);
    }
    // query.scheduledTime = { $exists: !!payload.isScheduled };

    // query['orchestratorTask.state'] = query.isHistory ? { $in: [ 'DONE', 'CANCELED' ]} : { $nin: [ 'DONE', 'CANCELED' ]};

    const aggregates = [
      ...infrastructureTaskDefaultQuery,
      {
        $match: query
      }
    ];
    return await InfrastructureTaskSchema.aggregate(aggregates).sort({ priority: 1 });
  }

  async listByInfrastructure(infrastructureId: string, organization: string) {
    return InfrastructureTaskSchema.find({ infrastructure: infrastructureId, organization })
      .populate('infrastructure', '_id floors name floors._id floors.name floors.number floor.status')
      .populate('area', '_id name')
      .populate({
        path: 'orchestratorTask',
        select: '_id name assignedToDevice area startDate finishDate',
        populate: {
          path: 'assignedToDevice',
          model: 'Device',
          select: '_id name'
        }
      }).sort({ createdAt: -1 });
  }


  async create(body: InfrastructureTask): Promise<InfrastructureTask> {
    const result = await InfrastructureTaskSchema.create(body);
    return result;
  }

  async update(taskId: string, body: any): Promise<InfrastructureTask> {

    const result = await InfrastructureTaskSchema.findOneAndUpdate({ _id: taskId }, body, { new: true }).populate('orchestratorTask').lean();

    if (body.status === InfrastructureTaskStatus.IN_PROGRESS ||
      body.status === InfrastructureTaskStatus.COMPLETED ||
      body.status === InfrastructureTaskStatus.CANCELED ||
      body.status === InfrastructureTaskStatus.FAILED) {
      const date = new Date();
      const prop = body.status === InfrastructureTaskStatus.IN_PROGRESS ? 'startDate' : 'finishDate';
      await TaskSchema.findByIdAndUpdate(result.orchestratorTask._id, { [prop]: date });
    }

    await this.notifyTaskStageChanged(result);
    return result;
  }

  async notifyTaskStageChanged(task: InfrastructureTask) {
    let title = '';
    let description = '';
    let action = '';
    switch (task.status) {
      case InfrastructureTaskStatus.IN_PROGRESS:
        title = 'Task in progress';
        description = `Task ${task.taskNumber} is now in progress`;
        action = PM_SI_ACTIONS.TASK_IN_PROGRESS;
        break;
      case InfrastructureTaskStatus.ERROR:
        title = 'Error in task';
        description = `Task ${task.taskNumber} has an error. Check the task and try again please.`;
        action = PM_SI_ACTIONS.TASK_ERROR;
        break;
      case InfrastructureTaskStatus.COMPLETED:
        title = 'Task completed';
        description = `Task ${task.taskNumber} has been completed.`;
        action = PM_SI_ACTIONS.TASK_COMPLETED;
        break;
      case InfrastructureTaskStatus.FAILED:
        title = 'Task Failed';
        description = `Task ${task.taskNumber} has failed. Check the task and try again please.`;
        action = PM_SI_ACTIONS.TASK_FAILED;
        break;
    }

    if (!action) {
      return;
    }

    const domain = await this.usersService.getOrgDomain(task.organization);
    const notification = {
      title,
      body: description,
      data: {
        url: `https://${domain + '.' || ''}${process.env.DOMAIN || 'dev.aitheon.com'}/smart-infrastructure/infrastructure/${task.infrastructure}/tasks`
      }
    } as Notification;
    this.pushNotificationsService.sendPushNotification(notification, [task.orchestratorTask.createdBy], action, task.organization);
  }

  async findById(taskId: string): Promise<InfrastructureTask> {
    return InfrastructureTaskSchema.findById({ _id: taskId }).populate('infrastructure', '_id floors name floors.name floors.number floor.status')
      .populate('area', '_id name')
      .populate({
        path: 'orchestratorTask',
        select: '_id name assignedToDevice area',
        populate: {
          path: 'assignedToDevice',
          model: 'Device',
          select: '_id name'
        }
      });
  }

  // Needs Refactor
  async updateOrchestratorTask(taskId: string, orchestratorTask: any) {
    return await TaskSchema.findByIdAndUpdate(taskId, orchestratorTask);
  }

  async deleteTaskById(taskId: string, organization: string) {
    const tasks = await InfrastructureTaskSchema.find({
      $or: [
        { _id: taskId }, // Parent
        { parent: taskId } // Sub task
      ]
    }).populate('orchestratorTask').lean();
    // Delete parent and sub tasks
    await InfrastructureTaskSchema.deleteMany({
      $or: [
        { _id: taskId }, // Parent
        { parent: taskId } // Sub task
      ]
    });
    await Promise.all(tasks.map(async (task: InfrastructureTask) => {
      return await this.graphService.taskDeleted({ organization, task });
    }));
    return;
  }

  async getByOrchestratorTask(orchestratorTaskId: string) {
    return InfrastructureTaskSchema.findOne({ orchestratorTask: orchestratorTaskId });
  }

  async createRobotTask(payload: CreateRobotTask) {
    const { name, assignedToDevice, organization } = payload;
    const recurring = payload.recurringType !== RecurringType.NONE;
    const orchestratorTaskToSave = {
      name,
      assignedToDevice,
      recurring,
      service: environment.service._id,
      organization: organization
    } as Task;
    const taskResponse = await TaskSchema.create(orchestratorTaskToSave);
    const orchestratorTask = taskResponse.toObject();

    if (payload.area && (typeof payload.area === 'object')) {
      const area = payload.area._id ? await this.areasService.update(payload.area._id, payload.area as any)
                                    : (await this.areasService.create(payload.area as any)).toObject();
      delete payload.area;
      payload = {...payload, area: area._id } as any;
    }

    await this.createInfrastructureTask(payload, orchestratorTask, organization);
  }

  async createOrchestratorTask(payload: any, current: Current) {
    const { name, assignedToDevice } = _.pickBy(payload.orchestratorTask, _.identity);
    const recurring = payload.recurringType !== RecurringType.NONE;
    const orchestratorTask = {
      name,
      assignedToDevice,
      recurring,
      service: environment.service._id,
      organization: current.organization._id
    } as Task;
    const taskResponse = await this.tasksApi.create(orchestratorTask, {
      headers: {
        'Authorization': `JWT ${current.token}`,
        'organization-id': current.organization._id
      }
    });
    return taskResponse.body;
  }

  async createInfrastructureTask(payload: any, orchestratorTask: Task, organization: string) {
    const bodyTask = _.omit(payload, 'orchestratorTask');
    const infrastructureTask = {
      ...bodyTask,
      orchestratorTask: orchestratorTask._id,
      organization: organization
    } as InfrastructureTask;
    let priority = 1;
    const lastTask = await InfrastructureTaskSchema.findOne({
      infrastructure: infrastructureTask.infrastructure,
      status: InfrastructureTaskStatus.PENDING
    }).sort({ priority: -1 });
    if (lastTask) {
      priority = (lastTask.priority || 0) + 1;
    }
    infrastructureTask.priority = priority;
    return this.create(infrastructureTask);
  }

  async createInfrastructureTaskFromDevice(device: Device, current: Current, defaultTask: any) {
    const orchestratorTask = {
      name: device.name,
      type: 'TASK',
      assignedToDevice: device._id,
      service: environment.service._id,
      createdBy: current.user._id,
      organization: current.organization._id,
      state: 'PENDING'
    } as any;

    // TO_DO: Rework to use @aitheon/orchestrator(issue with assignedToDevice)
    const taskResponse = await TaskSchema.create(orchestratorTask);
    const task = taskResponse.toObject();

    const infrastructureTask = {
      _id: defaultTask.newTaskId,
      orchestratorTask: task._id,
      type: defaultTask.defaultTaskType,
      name: device.name,
      organization: current.organization._id,
      infrastructure: device.infrastructure
    } as InfrastructureTask;

    if (defaultTask.defaultTaskType === InfrastructureTaskType.GO_TO) {
      infrastructureTask.area = defaultTask.defaultTaskArea;
      infrastructureTask.floor = defaultTask.defaultTaskFloor;
    }
    if (defaultTask.defaultTaskType === InfrastructureTaskType.CHARGE) {
      infrastructureTask.station = (device as any).chargingStation;
    }
    return this.create(infrastructureTask);
  }

  async findTaskForDevice(device: Device) {
    return await this.getPriorityTask(true, device) || await this.getPriorityTask(false, device);
  }

  async getFilteredActivity(filter: ActivityFilter) {
    const { organization, infrastructures, areas, floors, startDate, endDate, taskTypes, devices } = filter;

    const query = [{ organization: new ObjectId(organization) },
                   { status: InfrastructureTaskStatus.COMPLETED }] as any[];

    if (floors && floors.length) {
      query.push({ floor: { $in: floors.map(f => new ObjectId(f)) }});
    }
  // TO_DO: when client will be ready. Need to change logic
    // if (areas && areas.length) {
    //   query.push({ 'area._id': { $in: areas.map(a => new ObjectId(a)) }});
    // }


    if (taskTypes && taskTypes.length) {
      query.push({ type: { $in: taskTypes }});
    }

    if (devices && devices.length) {
      query.push({ 'orchestratorTask.assignedToDevice._id': { $in: devices.map(d => new ObjectId(d)) }});
    }

    if (startDate) {
      query.push({ 'orchestratorTask.startDate': { $gte: new Date(startDate) }});
    }

    if (endDate) {
      query.push({ 'orchestratorTask.finishDate': { $lte: new Date(endDate) }});
    }

    const aggregates: Array<any> = [
      {
        $lookup: {
          'from': 'orchestrator__tasks',
          'localField': 'orchestratorTask',
          'foreignField': '_id',
          'as': 'orchestratorTask'
        }
      },
      {
        $unwind: { path: '$orchestratorTask', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          'from': 'smart_infrastructure__infrastructures',
          'localField': 'infrastructure',
          'foreignField': '_id',
          'as': 'infrastructure'
        }
      },
      {
        $unwind: { path: '$infrastructure', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          'from': 'smart_infrastructure__areas',
          'localField': 'area',
          'foreignField': '_id',
          'as': 'area'
        }
      },
      {
        $unwind: { path: '$area', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          'from': 'device_manager__devices',
          let: { device_id: '$orchestratorTask.assignedToDevice' },
          pipeline: [
            { $match: { $expr: { $eq: [ '$_id', '$$device_id' ] } }, },
            { $project : { _id: 1, name: 1 } }
          ],
          'as': 'orchestratorTask.assignedToDevice'
        }
      },
      {
        $unwind: { path: '$orchestratorTask.assignedToDevice', preserveNullAndEmptyArrays: true }
      },
      {
        $match:
        {
          $and: query
        }
      }
    ];

    return await InfrastructureTaskSchema.aggregate(aggregates);
  }

  async assignTaskToDevice(deviceId: string, taskId: string, current: Current) {
    const taskResponse = await this.tasksApi.update(taskId,
      { assignedToDevice: deviceId } as Task,
      {
        headers: {
          'Authorization': `JWT ${current.token}`,
          'organization-id': current.organization._id
        }
      });
    return taskResponse.body;
  }

  async getPriorityTask(isAssigned: boolean, device: Device) {
    // tslint:disable-next-line: no-null-keyword
    const assigning = isAssigned ? device._id : { $eq: null } as any;
    const populationQuery = [
      {
        $lookup: {
          from: 'orchestrator__tasks',
          localField: 'orchestratorTask',
          foreignField: '_id',
          as: 'orchestratorTask',
        }
      },
      {
        $unwind: {
          path: '$orchestratorTask',
          preserveNullAndEmptyArrays: true
        },
      },
      {
        $lookup: {
          from: 'smart_infrastructure__areas',
          localField: 'area',
          foreignField: '_id',
          as: 'area',
        }
      },
      {
        $unwind: {
          path: '$area',
          preserveNullAndEmptyArrays: true
        },
      },
      {
        $lookup: {
          from: 'smart_infrastructure__infrastructures',
          localField: 'infrastructure',
          foreignField: '_id',
          as: 'infrastructure',
        }
      },
      {
        $unwind: {
          path: '$infrastructure',
          preserveNullAndEmptyArrays: true
        },
      }
    ];

    const query = {
      ['orchestratorTask.assignedToDevice']: typeof assigning === 'string' ? new ObjectId(assigning) : assigning,
      status: InfrastructureTaskStatus.PENDING,
      ['infrastructure._id']: new ObjectId(device.infrastructure),
      // tslint:disable-next-line: no-null-keyword
      scheduledDateTime: null
    } as any;
    if (device.defaultTask) {
      query._id = { $ne: new ObjectId(device.defaultTask._id) };
    }
    const aggregates = [
      ...populationQuery,
      {
        $match: query
      }
    ];
    const tasks = await InfrastructureTaskSchema.aggregate(aggregates).sort({ priority: 1 }).limit(1);
    const task = tasks[0];

    // display floor task level
    if (!task) {
      return;
    }

    task.floor = task.infrastructure.floors.find((f: any) => f._id.toString() === task.floor.toString());
    return task;
  }

  async updatePriorities(tasks: string[], current: Current): Promise<string[]> {
    return Promise.all(tasks.map(async (task, i) => {
      await InfrastructureTaskSchema.findOneAndUpdate({ _id: task }, { priority: i + 1 }).lean();
      return task;
    }));
  }

  // TO_DO: Remove after getting real data
  // async dummyEndpoint() {
  //   // const dummyArr = this.generateDummy();
  //   const dataToSave = {
  //     mapOverlayIntensity: intensity,
  //     taskId: '5f0f10f5566fbf00122eef10',
  //     deviceId: '',
  //     floorId: '',
  //     isPersistent: true
  //   } as MapOverlay;
  //   await this.updateMapOverlay(dataToSave);
  // }

  async convertPixelsToBuffer(data: number[][] = intensity): Promise<Buffer> {
    const png = new PNG({
      width: data[0].length,
      height: data.length,
      filterType: -1
    });

    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        const intensityIndex = data[y][x];
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 255;
        switch (intensityIndex) {
          case MAP_OVERLAY_STATUS_CODES.BEHIND_AREA:
          case MAP_OVERLAY_STATUS_CODES.BORDERS_AREA:
            a = 0;
            break;
          case MAP_OVERLAY_STATUS_CODES.COLLISION_INSIDE_AREA:
            r = 255;
            g = 51;
            b = 51;
            // For opacity, to check if something behind on the map or not
            a = 50;
            break;
          // For area that clearing
          default:
            r = 103;
            g = 178;
            b = 49;
            a = 255 * intensityIndex / 100;
        }
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = a;
      }
    }

    const fileBuffer = await this.streamToBuffer(png.pack());
    return fileBuffer;
  }

  async convertBufferToPNG(fileBuffer: Buffer): Promise<FileModel> {
    const fileName = new ObjectId().toHexString();
    const contentType = 'image/png';
    // TO_DO: Figure if we need to save as a document in drive
    const documentSchema = new DocumentSchema({ name: fileName });
    const storeKey = `${ environment.service._id }/DOCUMENTS${ documentSchema._id.toString() }${ path.extname(fileName) }`;
    const fileResult = await this.s3Manager.uploadFile(storeKey, contentType, fileBuffer);
    const signedUrl = await this.s3Manager.getSignedUrl(storeKey, fileName, 315569520);
    return {
      name: fileName,
      signedUrl,
      contentType
    } as FileModel;
  }

  async convertPixelsToPNG(data: number[][]): Promise<FileModel> {
    const fileBuffer = await this.convertPixelsToBuffer(data);
    return this.convertBufferToPNG(fileBuffer);
  }

  private streamToBuffer(stream: Stream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffers = [] as any;
      stream.on('error', reject);
      stream.on('data', (data: any) => buffers.push(data));
      stream.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  @Event()
  async updateMapOverlay(payload: MapOverlay, organizationId: string) {
    try {
      const fileBuffer = await this.convertPixelsToBuffer(payload.mapOverlayIntensity);

      if (payload.isPersistent) {
        const finalSnapshot = await this.convertBufferToPNG(fileBuffer);
        await InfrastructureTaskSchema.findByIdAndUpdate(payload.taskId, { finalSnapshot });
      }

      payload.base64Image = fileBuffer.toString('base64');
      delete payload.mapOverlayIntensity;
      this.socketService.broadcast(organizationId, WS_EVENTS.MAP_OVERLAY, payload);
    } catch (err) {
      logger.error(['updateMapOverlay.convertPixelsToPNG'], err);
    }
  }

  // Move logic to DM:
  // @Action()
  // async getTaskForDevice(payload: { deviceId: string }) {
  //   const { deviceId } = payload;
  //   const device = await this.deviceManagerService.getDeviceById(deviceId);
  //   const task = await this.findTaskForDevice(device);

  //   if (task && !task.orchestratorTask.assignedToDevice) {
  //     await TaskSchema.findByIdAndUpdate(task.orchestratorTask._id, { assignedToDevice: deviceId });
  //     task.orchestratorTask.assignedToDevice = deviceId;
  //   }

  //   return task;
  // }

  @Action()
  async patchTask(task: { _id: string, status: string }) {
    const result = await InfrastructureTaskSchema.findOneAndUpdate({ _id: task._id }, task, { new: true }).populate('orchestratorTask').lean();

    if (task.status === InfrastructureTaskStatus.IN_PROGRESS ||
      task.status === InfrastructureTaskStatus.COMPLETED ||
      task.status === InfrastructureTaskStatus.CANCELED ||
      task.status === InfrastructureTaskStatus.FAILED) {
      const date = new Date();
      const prop = task.status === InfrastructureTaskStatus.IN_PROGRESS ? 'startDate' : 'finishDate';
      await TaskSchema.findByIdAndUpdate(result.orchestratorTask._id, { [prop]: date });
    }

    this.notifyTaskStageChanged(result);
    return result;
  }

}
