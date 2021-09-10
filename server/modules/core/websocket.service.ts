import { Service, Inject, Container } from 'typedi';
import * as SocketIo from 'socket.io';
import * as cookieParser from 'cookie-parser';
import * as url from 'url';
import { getUserFromRequest, Current } from '@aitheon/core-server';
import { logger } from '@aitheon/core-server';
import { IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDefined, IsOptional, Min, IsDateString, IsBoolean } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
import { ErrorNotAuthorized } from './errors.service';
import * as http from 'http';

const ORG_ROOM_PREFIX = 'ORGANIZATION_';

export enum WS_EVENTS {
  CHANGE_POSITION = 'CHANGE_POSITION',
  MAP_OVERLAY = 'MAP_OVERLAY',
}

@JSONSchema({ description: 'Web socket events' })
export class WsEventsWrapper {

  @IsOptional()
  @IsEnum(WS_EVENTS)
  events: WS_EVENTS;
}

@Service()
export class WebsocketService {

  private io: SocketIO.Server;

  constructor() {
  }

  private socketAuthMiddleware(socket: SocketIo.Socket, next: (err?: any) => void) {
    cookieParser()(socket.request, undefined, async () => {
      const parsedUrl = url.parse(socket.request.url, true);
      socket.request.query = parsedUrl.query;
      const current = await getUserFromRequest(socket.request, []);
      socket.request.currentUser = current.user;
      socket.request.organization = current.organization;
      if (current && current.user && current.organization) {
        return next();
      }
      next(new ErrorNotAuthorized('Not authorized'));
    });
  }

  async broadcast(room: string, evt: string, pld: any) {
    this.io.to(ORG_ROOM_PREFIX + room).emit(evt, pld);
  }

  async init(server: http.Server) {
    this.io = SocketIo(server);
    this.io.use(this.socketAuthMiddleware.bind(this));
    this.io.on('connection', this.socketConnected.bind(this));
  }

  private async socketConnected(socket: SocketIo.Socket) {
    logger.debug('socket connected', socket.id);

    const room = ORG_ROOM_PREFIX + socket.request.organization._id;
    logger.debug('socket joining room', socket.id, room);
    socket.join(room);
    socket.on('message', (message: { type: WS_EVENTS, data: any }) => {
      this.parseMessage(message);
    });
  }

  async parseMessage(body: { type: WS_EVENTS, data: any }) {
    try {
      const { data, type } = body;
      logger.debug(`[WebSocketServer] [Received Message type: `, type, JSON.stringify(data));

      switch (type) {
        case WS_EVENTS.CHANGE_POSITION:
          break;
        default:
          logger.debug('[WebSocketClient] Message not supported: ', body);
          break;
      }
    } catch (err) {
      logger.debug('[WebSocketClient] Error: ', err.message || err);
    }
  }

}
