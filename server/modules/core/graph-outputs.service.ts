import { Service, Inject, Container } from 'typedi';
import * as _ from 'lodash';
import { OutputService, Transporter, TransporterService } from '@aitheon/transporter';
import { ProjectTask as ProjectTaskSocket } from '../../sockets/ProjectManager/projectTask';
import { Comment as CommentSocket } from '../../sockets/ProjectManager/comment';
import { InfrastructureType } from '../infrastructures/infrastructure.model';



@Service()
@Transporter()
export class GraphOutputsService extends TransporterService {


  constructor() {
    super(Container.get('TransporterBroker'));
  }

  @OutputService({ socket: ProjectTaskSocket, core: false, subgraphGroups: [InfrastructureType.FACTORY, InfrastructureType.BUILDING, InfrastructureType.WAREHOUSE] })
  async taskCreated(data: { organization: string, task: any }) {
    const task = new ProjectTaskSocket();
    const result = { ...task, ...data.task, organization: data.organization } ;
    return result;
  }

  @OutputService({ socket: ProjectTaskSocket, core: true })
  async coreTaskCreated(data: { organization: string, task: any }) {
    const task = new ProjectTaskSocket();
    const result = { ...task, ...data.task, organization: data.organization } ;
    return result;
  }

  @OutputService({ socket: ProjectTaskSocket, core: true })
  async coreTaskUpdated(data: { organization: string, task: any }) {
    const task = new ProjectTaskSocket();
    const result = { ...task, ...data.task, organization: data.organization } ;
    return result;
  }


  @OutputService({ socket: ProjectTaskSocket, subgraphGroups: [InfrastructureType.WAREHOUSE, InfrastructureType.BUILDING] })
  async taskDeleted(data: { organization: string, task: any }) {
    const task = new ProjectTaskSocket();
    const result = { ...task, ...data.task, organization: data.organization } ;
    return result;
  }


  @OutputService({ socket: ProjectTaskSocket, subgraphGroups: [InfrastructureType.BUILDING, InfrastructureType.WAREHOUSE] })
  async taskUpdated(data: { organization: string, task: any }): Promise<ProjectTaskSocket> {
    const task = new ProjectTaskSocket();
    const result = { ...task, ...data.task, organization: data.organization } ;
    return result as any;
  }


  @OutputService({ socket: CommentSocket, core: false, subgraphGroups: [InfrastructureType.FACTORY] })
  async commentAdded(data: {organization: string, comment: Comment}) {
    const comment = new CommentSocket();
    const result = { ...comment, ...data.comment, organization: data.organization };
    return result;
  }

  @OutputService({ socket: CommentSocket })
  async commentReplied(data: {organization: string, comment: Comment}) {
    const comment = new CommentSocket();
    const result = { ...comment, ...data.comment, organization: data.organization };
    return result;
  }

}
