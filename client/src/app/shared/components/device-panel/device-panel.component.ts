import { FormBuilder, FormGroup } from '@angular/forms';
import { InfrastructureRestService, DeviceSearch, Device, Floor } from '@aitheon/smart-infrastructure';
import { ViewChild, Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges, HostListener } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as d3 from 'd3';
import { InfrastructureService } from '../../../infrastructures/infrastructure.service';
import { DeviceTypesRestService, DeviceType } from '@aitheon/device-manager';

@Component({
  selector: 'ai-device-panel',
  templateUrl: './device-panel.component.html',
  styleUrls: ['./device-panel.component.scss']
})
export class DevicePanelComponent implements OnInit, OnChanges {
  @Input() showDevicePanel: boolean;
  @Input() infrastructure: string;
  @Input() currentFloor: Floor;
  @Output() onClosePanel: EventEmitter<boolean> = new EventEmitter<boolean>();
  @ViewChild('panelElement') panelElement;

  searchForm: FormGroup;
  devices: Device[];
  filteredDevices: Device[];
  filter: DeviceSearch;
  selectedDevice: Device;
  taskInfoOpen: boolean = false;

  taskInfoPosition: {
    left: string,
    top: string,
  } = {} as any;

  typesList: Array<{ name: string, value: string }> = [];
  allowOutsideClick = false;

  constructor(private infrastructureRestService: InfrastructureRestService,
              private infrastructureService: InfrastructureService,
              private deviceTypesRestService: DeviceTypesRestService,
              private fb: FormBuilder) { }

  @HostListener('window:scroll', ['$event']) closeInfoDetails() {
    this.taskInfoOpen = false;
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement) {
    const clickedInside = this.panelElement.nativeElement.contains(targetElement);
    if (!clickedInside && this.allowOutsideClick === true && !targetElement.classList.contains('ng-option-label')) {
      this.closePanel();
    }
  }

  ngOnInit(): void {
      this.deviceTypesRestService.listAll().subscribe((types: DeviceType[]) => {
        this.typesList = types.map((type: DeviceType) => {
          return {
            value: type.name,
            name: this.infrastructureService.humanize(type.name)
          };
        });
      });
    this.buildForm();
    this.getDevices('');
  }

  buildForm() {
    this.searchForm = this.fb.group({
      name: '',
      type: [this.typesList && this.typesList[0]?.value || null]
    });

    this.searchForm.get('name').valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe(res => {
      this.getDevices(res)
    });

    this.searchForm.get('type').valueChanges.subscribe(res => {
      if (res !== 'ALL') {
        this.filteredDevices = this.devices.filter(d => d.type.name === res);
      } else  {
        this.filteredDevices = this.devices;
      }
    })
  }

  getDevices(search?: string) {
    this.filter = {
      name: search
    }

    const query = {
      ...this.filter,
      infrastructure: this.infrastructure
    } as DeviceSearch;

    this.infrastructureRestService.searchDevices(query).subscribe((devices: Device[]) => {
      if (this.currentFloor) {
        this.devices = this.filteredDevices = devices.filter(device => device.floor === this.currentFloor._id);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.showDevicePanel === true) {
      const switchOutsideClick = setTimeout(() => {
        this.allowOutsideClick = true;
        clearTimeout(switchOutsideClick);
      }, 44);
    }
    if (changes.currentFloor) {
      this.getDevices('');
    }
  }

  selectDevice(device: Device) {
    this.selectedDevice = device;
  }

  closePanel() {
    this.selectedDevice = null;
    this.closeTaskInfo();
    this.allowOutsideClick = false;
    this.onClosePanel.emit(true);
  }

  toggleInfo(e: Event) {
    const target = e.target as any;
    const rect = target.getBoundingClientRect();
    this.taskInfoPosition = {
      left: `${rect.left - 287}px`,
      top: `${(rect.top + 20)}px`
    };

    this.taskInfoOpen = !this.taskInfoOpen;
  }

  closeTaskInfo() {
    this.taskInfoOpen = false;
  }

  getBatteryColor(device: Device) {
    switch (true) {
      case (device?.batteryHealth <= 10):
        this.setBatteryIconColor('#E96058', [0]);
        break;
      case (device?.batteryHealth <= 30):
        this.setBatteryIconColor('#E96058', [0, 1]);
        break;
      case (device?.batteryHealth <= 60):
        this.setBatteryIconColor('#FFF', [0, 1, 2]);
        break;
      case (device?.batteryHealth > 60):
        this.setBatteryIconColor('#FFF', [0, 1, 2, 3]);
        break;
    }
  }

  get batteryIcon(): any {
    return [
      d3.select('#battery'),
      d3.select('#battery-low'),
      d3.select('#battery-medium'),
      d3.select('#battery-full')
    ];
  }

  setBatteryIconColor(color: string, sectionsToFill: number[]) {
    sectionsToFill.forEach(item => {
      this.batteryIcon[item].attr('fill', color);
    })
  }
}
