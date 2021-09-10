import 'reflect-metadata';

/**
 * Stage on board
 */
export class Stage {
    _id?: string;
    color: string;
    default: boolean;
    name: string;
    order: number;
    state: string;
}

Reflect.defineMetadata('schemaId', '5e9064c275ad3600121e3655', Stage);
