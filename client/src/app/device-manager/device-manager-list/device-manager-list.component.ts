import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Infrastructure, InfrastructureRestService, Device, DeviceSearch } from '@aitheon/smart-infrastructure';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'ai-device-manager-list',
  templateUrl: './device-manager-list.component.html',
  styleUrls: ['./device-manager-list.component.scss']
})
export class DeviceManagerListComponent implements OnInit {

  @Input() infrastructure: Infrastructure;
  @Input() devices: any;
  @Output() callAddDeviceModal: EventEmitter<boolean> = new EventEmitter<boolean>();

  filter: DeviceSearch;
  initialFiltersDate = {
    title: 'Device Manager'
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
  }

  addDevice() {
    this.callAddDeviceModal.emit(true);
    // this.router.navigate(['new'], { relativeTo: this.route }).then();
  }


}
