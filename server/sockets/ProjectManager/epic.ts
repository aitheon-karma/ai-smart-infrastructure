import 'reflect-metadata';

/**
 * Epic
 */
export class Epic {
    _id?: string;
    createdAt?: string;
    description?: string;
    endDate?: string;
    name: string;
    organization?: { [key: string]: any };
    reference?: string;
    startDate?: string;
    status?: string;
    updatedAt?: string;
}

Reflect.defineMetadata('schemaId', '5e90619475ad3600121e364c', Epic);
