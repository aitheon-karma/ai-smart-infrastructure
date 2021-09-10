import { Project } from '@aitheon/creators-studio';
import { GraphsRestService } from '@aitheon/system-graph';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { take, map } from 'rxjs/operators';

export enum ReferenceType {
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  FLOOR = 'FLOOR',
  STATION = 'STATION',
  CONTROLLER = 'CONTROLLER'
}

export enum ApplicationType {
  APPLICATION = 'APPLICATION',
  DASHBOARD = 'DASHBOARD',
  AUTOMATION = 'AUTOMATION',
  DEVICE_NODE = 'DEVICE_NODE',
}

export enum NodeStatus {
  PENDING = 'PENDING',
  TERMINATED = 'TERMINATED',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR',
  SAVED = 'SAVED'
}

export interface Application {
  graphNodeId: string;
  project: Project;
  status: NodeStatus;
  isLatest: boolean;
  uiElements: any[];
}

export interface GraphData {
  graphId: string;
  status: NodeStatus;
  applications: Application[]
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationsService {
  constructor(
    private graphsRestService: GraphsRestService,
  ) {}

  public getApplications(
    referenceId: string,
    referenceType: ReferenceType,
    applicationType?: ApplicationType | ApplicationType[],
  ): Observable<GraphData> {
    return this.graphsRestService.getReferenceType(referenceId, referenceType, true, true)
      .pipe(take(1), map(graph => this.getGraphData(graph, applicationType)));
  }

  public getGraphData(graph: any = {}, applicationType?: ApplicationType | ApplicationType[]): GraphData {
    const { graphNodes = [] } = graph;
    let applications = graphNodes.filter(graphNode => graphNode?.release?.project?.projectType || graphNode?.node?.project?.projectType)
      .map(graphNode => ({
        isLatest: graphNode?.isLatest,
        graphNodeId: graphNode._id,
        device: graphNode?.device,
        status: graphNode?.status,
        version: graphNode?.release?.tag || null,
        uiElements: graphNode.uiElements || [],
        project: typeof graphNode?.node?.project === 'object' ? graphNode?.node?.project : graphNode.release.project
      }));
    if (applicationType) {
      applications = applications.filter(app => {
        if (Array.isArray(applicationType)) {
          return applicationType.includes(app.project?.projectSubType) ||
            applicationType.includes(app.project?.projectType);
        }
        return app.project?.projectSubType?.includes(applicationType) ||
          app.project?.projectSubType?.includes(applicationType);
      });
    }
    return {
      graphId: graph._id,
      applications,
      status: graph.status
    };
  }
}
