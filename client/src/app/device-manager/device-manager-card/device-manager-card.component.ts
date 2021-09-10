import { Component, OnInit, OnChanges, SimpleChanges, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Device, Floor, Infrastructure, StationsRestService } from '@aitheon/smart-infrastructure';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ai-device-manager-card',
  templateUrl: './device-manager-card.component.html',
  styleUrls: ['./device-manager-card.component.scss']
})
export class DeviceManagerCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() device: Device;
  @Input() infrastructure?: Infrastructure;

  @ViewChild('taskCard') taskCard: ElementRef;

  chargeColor: any;
  statusColor: any;
  showTaskCard = false;
  statusTaskColor: any;
  taskCardPosition: string;
  subscriptions$: Subscription = new Subscription();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private stationsRestService: StationsRestService) {
  }

  ngOnInit(): void {
    this.setColorsToLabels();
  }

  ngOnChanges(changes: SimpleChanges) {
    const device = changes.device?.currentValue;

    if (device?.station && !device.floor) {
      this.setDeviceFloor(device.station);
    }
  }

  ngOnDestroy() {
    this.subscriptions$.unsubscribe();
  }

  public onCardClick(device: any): void {
    const event = (window.event || null) as any;
    const isCurrentTaskLinkClicked = event.target && event.target.classList.contains('current-task-link');

    if (isCurrentTaskLinkClicked) {
      this.showTaskInfo(event);
    } else {
      this.goToDetails(device);
    }
  }

  goToDetails(device: any) {
    this.router.navigate(['./', 'device', device._id], { relativeTo: this.route });
  }

  showTaskInfo(e: any) {
    e.preventDefault();
    this.taskCardPosition = '';

    setTimeout(() => {
      const coords = this.taskCard.nativeElement.getBoundingClientRect();
      this.taskCardPosition = coords.bottom > window.outerHeight ? 'top' : 'bottom';
      if (this.showTaskCard === false) {
        this.showTaskCard = true;
      }
    }, 21);
  }

  setColorsToLabels() {
    if (this.device) {
      this.chargeColor = {
        'device-card__meta__charge--red': this.device.batteryHealth > 0 && this.device.batteryHealth <= 19,
        'device-card__meta__charge--yellow': this.device.batteryHealth >= 20 && this.device.batteryHealth <= 39,
        'device-card__meta__charge--green': this.device.batteryHealth >= 40
      };
      this.statusColor = {
        'device-card__info__status--aqua-blue': this.device.status === 'ONLINE',
        'device-card__info__status--base-yellow': this.device.status === 'Need charging',
        'device-card__info__status--base-orange': this.device.status === 'Abstracted' || this.device.status === 'Lost',
        'device-card__info__status--base-red': this.device.status === 'Offline',
        'device-card__info__status--base-green': this.device.status === 'Working',
        'device-card__info__status--base-violet': this.device.status === 'READY',
      };
      if (this.device.currentTask) {
        this.statusTaskColor = {
          'device-card__info__status--aqua-blue': this.device.currentTask.status === 'SCHEDULED',
          'device-card__info__status--base-blue': this.device.currentTask.status === 'IN_PROGRESS',
          'device-card__info__status--base-violet': this.device.currentTask.status === 'PENDING',
          'device-card__info__status--base-orange': this.device.currentTask.status === 'CANCELED' || this.device.currentTask.status === 'PAUSED',
          'device-card__info__status--base-red': this.device.currentTask.status === 'FAILED',
          'device-card__info__status--base-green': this.device.currentTask.status === 'COMPLETED'
        };
      }
    }
  }

  private setDeviceFloor(stationId: string): void {
    this.subscriptions$.add(
      this.stationsRestService.getById(stationId)
        .subscribe(station => {
          this.device.floor = this.getStationFloorOrNull(station);
        }));
  }

  private getStationFloorOrNull(station: any): Floor | null {
    const stationFloorId = station.floor;
    let stationFloor = stationFloorId
      ? this.infrastructure.floors.find(floor => floor._id === stationFloorId)
      : null;

    return stationFloor || null;
  }
}
