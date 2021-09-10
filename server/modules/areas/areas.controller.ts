import { Get, Post, Delete, Put, Body, Param, Res, Req, JsonController, Authorized, CurrentUser, QueryParam } from 'routing-controllers';
import { Inject } from 'typedi';
import { Area } from './area.model';
import { Request, Response } from 'express';
import { Current, logger } from '@aitheon/core-server';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { AreasService } from './areas.service';

@Authorized()
@JsonController('/api/areas')
export class AreasController {

  constructor() { }

  @Inject()
  areasService: AreasService;


  @Get('/')
  @OpenAPI({ summary: 'List of areas', operationId: 'list' })
  @ResponseSchema(Area, { isArray: true })
  async list(@CurrentUser() current: Current, @Res() response: Response, @Req() request: Request, @QueryParam('infrastructure') infrastructure: string, @QueryParam('floor') floor: string, @QueryParam('type') type: string) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const query = {
        infrastructure,
        floor,
        type
      };

      const result = await this.areasService.listByQuery(query);
      return response.json(result);
    } catch (err) {
      logger.error('[AreasController.list]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Post('/')
  @OpenAPI({ summary: 'Create area', operationId: 'create' })
  @ResponseSchema(Area)
  async create(@CurrentUser() current: Current, @Body() area: Area, @Res() response: Response) {
    try {
      if (!current.organization) {
        return response.status(403).send({ message: 'Allowed only for organizations' });
      }

      const result = await this.areasService.create(area);
      return response.json(result);
    } catch (err) {
      logger.error('[AreasController.create]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Get area by id', operationId: 'getById' })
  @ResponseSchema(Area)
  async getById(@Param('id') id: string, @Res() response: Response) {
    try {
      const result = await this.areasService.findById(id);
      return response.json(result);
    } catch (err) {
      logger.error('[AreasController.getById]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Put('/:id')
  @OpenAPI({ description: 'Update area by id', operationId: 'update' })
  @ResponseSchema(Area)
  async update(@CurrentUser() current: Current, @Param('id') id: string, @Body() area: Area, @Res() response: Response) {
    try {
      const result = await this.areasService.update(id, area);
      return response.json(result);
    } catch (err) {
      logger.error('[AreasController.update]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

  @Delete('/:id')
  @OpenAPI({ description: 'Remove area by id', operationId: 'remove' })
  async remove(@Param('id') id: string, @Res() response: Response) {
    try {
      const result = await this.areasService.remove(id);
      return response.sendStatus(204);
    } catch (err) {
      logger.error('[AreasController.remove]', err);
      return response.status(422).json({ message: err.message || err });
    }
  }

}
