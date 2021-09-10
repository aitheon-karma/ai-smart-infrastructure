import 'reflect-metadata';

/**
 * Create task for robot
 */
export class CreateRobotTask {
    _id?: any;
    area?: { [key: string]: any } | string;
    assignedToDevice?: string;
    endDateTime?: string;
    floor: string;
    infrastructure: string;
    name: string;
    orchestratorTask?: { [key: string]: any };
    organization: string;
    parent?: string;
    priority?: number;
    recurringType?: string;
    scheduledDateTime?: string;
    station?: string;
    status?: string;
    type: string;
    waitInfo?: { [key: string]: any };
}


Reflect.defineMetadata('schemaId', '5f6f4ddaf2e52c00123c355c', CreateRobotTask);
