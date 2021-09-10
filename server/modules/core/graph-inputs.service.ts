import { Service, Inject, Container } from 'typedi';
import * as _ from 'lodash';
import { Transporter, TransporterService, InputService } from '@aitheon/transporter';
import { ProjectTask as ProjectTaskSocket } from '../../sockets/ProjectManager/projectTask';
import { ProjectTaskID as ProjectTaskIdSocket } from '../../sockets/ProjectManager/projectTaskId';
import { Comment as CommentSocket } from '../../sockets/ProjectManager/comment';
import { Epic as EpicSocket } from '../../sockets/ProjectManager/epic';
import { EpicID as EpicIdSocket } from '../../sockets/ProjectManager/epicId';
import { Project as ProjectSocket } from '../../sockets/ProjectManager/project';
import { ProjectID as ProjectIdSocket } from '../../sockets/ProjectManager/projectId';
import { Stage as StageSocket } from '../../sockets/ProjectManager/stage';
import { logger } from '@aitheon/core-server';
import { InfrastructureType } from '../infrastructures/infrastructure.model';
import { CreateRobotTask as CreateRobotTaskSocket } from '../../sockets/SmartInfrastructure/createRobotTask';
import { InfrastructureTasksService } from '../infrastructure-tasks/infrastructure-tasks.service';



@Service()
@Transporter()
export class GraphInputsService extends TransporterService {

  @Inject(() => InfrastructureTasksService)
  infrastructureTasksService: InfrastructureTasksService;

  constructor() {
    super(Container.get('TransporterBroker'));
  }

  @InputService({ core: false })
  async createRobotTask(data: CreateRobotTaskSocket) {
    try {
      logger.info(`[Create Robot task]`, data);
      await this.infrastructureTasksService.createRobotTask(data);
    } catch (err) {
      logger.error(`[Create Robot task]`, err);
    }
  }

  // Project tasks inputs
  @InputService({ core: false, subgraphGroups: [InfrastructureType.WAREHOUSE, InfrastructureType.BUILDING] })
  async createTask(data: ProjectTaskSocket) {
    try {
      logger.info(`[Create task]`, data);
      const { organization } = data as any;
      // await this.create(data, organization);
    } catch (err) {
      logger.error(`[Create task]`, err);
    }
  }

  @InputService({ core: false, subgraphGroups: [InfrastructureType.FACTORY, InfrastructureType.BUILDING, InfrastructureType.WAREHOUSE] })
  async updateTask(data: ProjectTaskSocket) {
    try {
      logger.info(`[Update task]`, data);
      const { organization } = data as any;
    } catch (err) {
      logger.error(`[Update task]`, err);
    }
  }

  @InputService({ core: false, subgraphGroups: [InfrastructureType.WAREHOUSE, InfrastructureType.FACTORY] })
  async deleteTask(data: ProjectTaskIdSocket) {
    try {
      logger.info(`[Delete task]`, data);
      const { organization } = data as any;
    } catch (err) {
      logger.error(`[Delete task]`, err);
    }
  }


  // Projects inputs

  @InputService({ core: false, subgraphGroups: [InfrastructureType.BUILDING] })
  async updateProject(data: ProjectSocket) {
    try {
      logger.info(`[Update project]`, data);
      const { organization } = data as any;
    } catch (err) {
      logger.error(`[Update project]`, err);
    }
  }

  @InputService({ core: false, subgraphGroups: [InfrastructureType.FACTORY] })
  async archiveProject(data: ProjectIdSocket) {
    try {
      logger.info(`[Archive project]`, data);
      const { organization } = data as any;
    } catch (err) {
      logger.error(`[Archive project]`, err);
    }
  }

}
