import { Device } from '@aitheon/smart-infrastructure';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import * as moment from 'moment';
import { Coordinates, DeviceSubtype } from '../../infrastructure-map';

@Component({
  selector: 'ai-device-popup',
  templateUrl: './device-popup.component.html',
  styleUrls: ['./device-popup.component.scss']
})
export class DevicePopupComponent implements OnChanges {
  @Input() config: {
    coordinates: Coordinates,
    device: any;
  };

  @Output() close = new EventEmitter<void>();

  isFirstMove: boolean;
  isActivityOpened: boolean;
  isTurnedToTop: boolean;
  isTurnedToLeft: boolean;
  userData = {
    temperature: 36.7,
    area: 'B10',
    lastPositionUpdate: moment(new Date()).format('hh:mm A, DD MMM'),
    detectedBy: 'device',
  };
  styles: {
    [key: string]: string,
  };
  size = {
    width: 480,
    height: 212,
  };
  deviceType: DeviceSubtype;
  deviceTypes = DeviceSubtype;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes.config?.currentValue) {
      if (!changes.config.previousValue) {
        this.isFirstMove = true;
      }
      this.deviceType = this.config.device.type?.name;
      this.size = {
        width: this.deviceType === DeviceSubtype.ROBOT ? 328 : 480,
        height: this.deviceType === DeviceSubtype.ROBOT ? 204 : 212,
      };
      this.userData.lastPositionUpdate = moment(new Date()).format('hh:mm A, DD MMM')
      this.calculatePopupPosition();
    }
  }

  calculatePopupPosition(): void {
    const { coordinates } = this.config;
    this.isTurnedToLeft = this.isTurnedToTop = false;
    const { innerWidth, innerHeight } = window;
    if (coordinates.x > innerWidth || coordinates.y > innerHeight) {
      this.onClose();
      return;
    }
    if (innerHeight - coordinates.y <= this.size.height) {
      this.isTurnedToTop = true;
    }
    if (innerWidth - coordinates.x <= this.size.width) {
      this.isTurnedToLeft = true;
    }
    this.styles = {
      transform: `translate(${this.isTurnedToLeft
        ? this.config.coordinates.x - this.size.width - 18
        : this.config.coordinates.x + 18}px, ${this.isTurnedToTop
        ? this.config.coordinates.y - this.size.height + 24
        : this.config.coordinates.y - 24}px)`,
      width: `${this.size.width}px`,
      height: `${this.size.height}px`,
    };

    if (this.isFirstMove) {
      this.delay.then(() => {
        this.isFirstMove = false;
      });
    }
  }

  public onClose(): void {
    this.close.emit();
    this.isActivityOpened = false;
  }

  public toggleActivity(): void {
    this.isActivityOpened = !this.isActivityOpened;
    if (this.isActivityOpened) {
      this.size.height = 393;
    } else {
      this.size.height = 212;
    }
    this.calculatePopupPosition();
  }

  get delay(): Promise<void> {
    return new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  public get device(): Device {
    return this.config?.device;
  }
}
