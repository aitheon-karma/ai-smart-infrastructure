import 'reflect-metadata';

/**
 * Project
 */
export class Project {
    _id?: string;
    cover?: string;
    createdAt?: string;
    createdBy?: { [key: string]: any };
    description?: string;
    estimatedCompletionDate?: string;
    isPlatformProject?: boolean;
    issueBoardEnabled?: boolean;
    key: string;
    name: string;
    priority?: number;
    progress?: { [key: string]: any };
    repositoryUrl?: string;
    roles?: { [key: string]: any }[];
    status?: string;
    type?: string;
    updatedAt?: string;
    workspaces?: string[];
}

Reflect.defineMetadata('schemaId', '5e8f610f5246280012166437', Project);
