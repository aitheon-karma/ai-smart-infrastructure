import { Injectable, EventEmitter } from '@angular/core';
//import { Device } from './device';
//import { Device } from '@aitheon/smart-infrastructure';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RunnerService {

  connecting = false;
  websocketUrl: string;
  error: any;
  logsOutput: Subject<string> = new Subject<string>();
  onDeviceConnectedCallback: (data: any) => any;

  private webSocket: WebSocket;
  private token: string;
  private reconnectTime = 5;

  constructor() {
    if (window.location.hostname === 'localhost') {
      this.websocketUrl = `wss://dev.aitheon.com/device-manager`;
    } else {
      this.websocketUrl = `wss://${window.location.hostname}/device-manager`;
    }
  }

  /**
  * Core code
  */
  connectToWs(deviceId: string) {
    if (this.webSocket && this.webSocket.readyState === this.webSocket.OPEN) {
      this.webSocket.send(JSON.stringify({ type: 'CURRENT_DEVICE.SET', data: { deviceId } }));
      return;
    }
    this.connecting = true;
    this.webSocket = new WebSocket(this.websocketUrl, 'aos-protocol-admin');
    this.webSocket.onmessage = (msg: MessageEvent) => {
      console.log('On aos-protocol-admin message: ', msg);
      const body = JSON.parse(msg.data) as { type: string, data: any };
      switch (body.type) {
        case 'CURRENT_DEVICE.SET':
          if (body.data.connected) {
            this.connecting = false;
          } else {
            this.error = 'You don\'t have device acccess.';
            this.connecting = false;
          }
          this.webSocket.send(JSON.stringify({ type: 'RUNNER.INFO', data: {} }));
          break;
        case 'CLIENT.ID':
          this.logsOutput.next(`You connected with clientId: ${ body.data.clientId }\n`);
          break;
        case 'RUNNER.INFO':
          this.logsOutput.next(`Runner connected. Version: ${ body.data.version || body.data.versoin }\n`);
          break;
        case 'RUNNER.LOGS':
          this.logsOutput.next(body.data.stdout);
          break;
        case 'RUNNER.DEVICES.NEW_DEVICE_CONNECTED':
          this.logsOutput.next(`A new device connected: ${body.data}`);
          this.onDeviceConnectedCallback(body.data);
          break;
        default:
          this.logsOutput.next(JSON.stringify(body));
          break;
      }
    };
    this.webSocket.onopen = (ev: Event) => {
      this.error = null;
      // this.connecting = false;
      this.webSocket.send(JSON.stringify({ type: 'CURRENT_DEVICE.SET', data: { deviceId } }));
    };
    this.webSocket.onclose = (ev: Event) => {
      console.log('WebSocket closed', ev);
      console.log('Websocket reconnecting in 5 seconds');
      this.error = 'Websocket reconnecting in 5 seconds';
      setTimeout(() => {
        this.connectToWs(deviceId);
      }, this.reconnectTime * 1000);
    }
    this.webSocket.onerror = (ev: Event) => {
      this.connecting = false;
      this.error = 'Can\'t connect to websocket.';
      console.log('WebSocket error', ev);
    }
  }

  deviceConnetionRequest(communicationType: string, onDeviceConnected: (data: any) => any) {
    this.send({ type: 'RUNNER.DEVICES.CONNECT_NEW_DEVICE', data: { communicationType } });
    this.onDeviceConnectedCallback = onDeviceConnected;
  }

  send(data: any) {
    if (this.webSocket && this.webSocket.readyState === this.webSocket.OPEN) {
      this.webSocket.send(JSON.stringify(data));
    } else {
      console.log(`Waiting for connection to re-send data`);
      setTimeout(() => {
        return this.send(data);
      }, (this.reconnectTime + 1) * 1000);
    }
  }

}

