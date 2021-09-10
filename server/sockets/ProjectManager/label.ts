import 'reflect-metadata';

/**
 * Label for task
 */
export class Label {
    _id?: string;
    color: string;
    createdAt?: string;
    name: string;
    project: { [key: string]: any };
    updatedAt?: string;
}

Reflect.defineMetadata('schemaId', '5e9032b875ad3600121e31d0', Label);
