import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { WsEventsWrapper, Translation, MapOverlay } from '@aitheon/smart-infrastructure';
import { Subject } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class WebSocketService {

  SOCKET_EVENTS = WsEventsWrapper.EventsEnum;

  positionChanged: Subject<{ device: string, position: Translation }> = new Subject<{ device: string, position: Translation }>();
  mapOverlay: Subject<MapOverlay> = new Subject<MapOverlay>();

  constructor(private socket: Socket) {

  }

  async init() {
    this.handleClientEvents();
  }

  private handleClientEvents() {
    this.socket.on(this.SOCKET_EVENTS.CHANGE_POSITION, (body: { device: string, position: Translation }) => {
      this.positionChanged.next(body);
    });
    this.socket.on(this.SOCKET_EVENTS.MAP_OVERLAY, (body: MapOverlay) => {
      this.mapOverlay.next(body);
    });
  }

}



