
import { ExpressMiddlewareInterface } from 'routing-controllers';
import { Middleware } from 'routing-controllers';
import { Request, Response } from 'express';

@Middleware({ type: 'before' })
export class OnlyOrganizationMiddleware implements ExpressMiddlewareInterface {

    use(request: Request, response: Response, next?: (err?: any) => any): any {

        if (!request.headers['organization-id'] && !request.cookies['organization-id']) {
          return response.status(400).send({message: 'Smart Infrastructure requires an organization'});
        }
        next();
    }

}
