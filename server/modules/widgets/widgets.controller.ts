import { Get, Post, Delete, Put, Body, Param, Res, Req, JsonController, Authorized, CurrentUser } from 'routing-controllers';
import { Inject, Container } from 'typedi';
import { Request, Response } from 'express';
import { Current, logger } from '@aitheon/core-server';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Widget } from './widget.model';
import { WidgetsService } from './widgets.service';
import { allWigets }   from './widget.config';
import { AutoDeskService } from '../autodesk/autodesk.service';




@Authorized()
@JsonController('/api/widgets')
export class WidgetsController {


  @Inject()
  private widgetsService: WidgetsService;

  @Inject()
  private autodeskService: AutoDeskService;

  @Get('/infrastructure/:id')
  @OpenAPI({ summary: 'List widgets by organization or personal', operationId: 'widgetList' })
  @ResponseSchema(Widget, {isArray: true})
  async list(@CurrentUser() current: Current, @Param('id') infrastructure: string, @Res() response: Response, @Req() request: Request) {

    const result = await this.widgetsService.findByParams({infrastructure});
    return response.json(result);
  }

  @Post('/infrastructure/:infrastructureId')
  @OpenAPI({ summary: 'Create a widget', operationId: 'createWidget' })
  async create(@CurrentUser() current: Current, @Param('infrastructureId') infrastructureId: string, @Res() response: Response, @Req() request: Request, @Body() widget: Widget ) {
    widget.infrastructure = infrastructureId;
    const result = await this.widgetsService.create(widget);
    return response.json(result);
  }



  @Put('/widget/:widgetId')
  @OpenAPI({ summary: 'Create a widget', operationId: 'updateWidget' })
  async update(@CurrentUser() current: Current, @Param('widgetId') widgetId: string, @Res() response: Response, @Req() request: Request, @Body() widget: Widget) {
    delete widget._id;
    const result = await this.widgetsService.update(widget, widgetId);
    return response.json(result);
  }


  @Delete('/widget/:widgetId')
  @OpenAPI({ summary: 'Create a widget', operationId: 'removeWidget' })
  async remove(@CurrentUser() current: Current, @Param('widgetId') widgetId: string, @Res() response: Response, @Req() request: Request) {
    const result = await this.widgetsService.delete(widgetId);
    return response.json(result);
  }

  @Get('/all')
  @OpenAPI({ summary: 'Get all widgets', operationId: 'listAllWidget' })
  async listAll(@CurrentUser() current: Current, @Res() response: Response, @Req() request: Request) {
    return response.json(allWigets);
  }


}
