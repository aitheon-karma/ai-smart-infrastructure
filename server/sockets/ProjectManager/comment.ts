import 'reflect-metadata';

/**
 * Task comment
 */
export class Comment {
    _id?: string;
    attachments?: { [key: string]: any }[];
    createdAt?: string;
    createdBy: { [key: string]: any };
    parent: { [key: string]: any };
    task: { [key: string]: any };
    text: string;
    updatedAt?: string;
}

Reflect.defineMetadata('schemaId', '5e90639675ad3600121e3652', Comment);
