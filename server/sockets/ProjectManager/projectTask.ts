import 'reflect-metadata';

/**
 * ProjectTask
 */
export class ProjectTask {
    _id?: string;
    archived: boolean;
    assigned?: { [key: string]: any };
    board: { [key: string]: any };
    commentsCount?: number;
    createdAt?: string;
    description?: string;
    epic?: { [key: string]: any };
    files?: { [key: string]: any };
    finishDate?: string;
    labels?: { [key: string]: any }[];
    name?: string;
    orchestratorTask?: { [key: string]: any };
    order?: number;
    organization?: { [key: string]: any };
    parent?: { [key: string]: any };
    priority?: number;
    project: { [key: string]: any };
    readOnly?: boolean;
    reference?: string;
    service?: string;
    stage: { [key: string]: any };
    startDate?: string;
    state?: string;
    type?: string;
    updatedAt?: string;
}

Reflect.defineMetadata('schemaId', '5e96e9ce8c1dad0011c9f227', ProjectTask);
