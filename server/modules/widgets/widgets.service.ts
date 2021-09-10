import Container, { Service, Inject } from 'typedi';
import { MailerService, SendMailOptions } from '../core/mailer.service';
import * as path from 'path';
import { Transporter, TransporterService, Action, Event, param } from '@aitheon/transporter';
import { logger } from '@aitheon/core-server';
import { WidgetSchema, Widget } from './widget.model';


@Service()
@Transporter()
export class WidgetsService extends TransporterService {


  mailerService: MailerService;

  constructor() {
    super(Container.get('TransporterBroker'));
    this.mailerService = Container.get(MailerService);
  }

  async findByParams(parms: any) {
   return WidgetSchema.find(parms);
  }

  async findById(_id: string) {
    return WidgetSchema.findById({_id});
  }


  async create(widget: Widget) {
    return WidgetSchema.create(widget);
  }

  async update(widget: Widget, widgetId: string) {
    return WidgetSchema.findOneAndUpdate({_id: widgetId}, widget, {new: true});
  }

  async delete(widgetId: string) {
    return WidgetSchema.findByIdAndDelete(widgetId);
  }



}
