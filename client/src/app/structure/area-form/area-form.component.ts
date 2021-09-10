import {InfrastructureRestService} from '@aitheon/smart-infrastructure';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import {FormBuilder, FormGroup, FormControl, Validators} from '@angular/forms';
import { bool } from 'aws-sdk/clients/signer';
import {ColorPickerDirective} from 'ngx-color-picker';

import {Subscription} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {AreaType, InfrastructureMapService} from '../../infrastructure-map';
import {InfrastructureService} from '../../infrastructures/infrastructure.service';

@Component({
  selector: 'ai-area-form',
  templateUrl: './area-form.component.html',
  styleUrls: ['./area-form.component.scss']
})
export class AreaFormComponent implements OnInit, OnDestroy {
  @ViewChild(ColorPickerDirective) colorPicker: ColorPickerDirective;
  @ViewChild('nameInput') nameInput: ElementRef;

  subscriptions$ =new Subscription();
  areaForm: FormGroup;
  show: boolean;
  data: any;
  submitted: boolean;
  shapeType: AreaType;
  existing: boolean;
  colorPickerOpened: boolean;
  devicesControl: FormControl;
  deviceControlSubscription$: Subscription;
  type: string;
  devices = [];
  stationDegree: number;
  isDegreeInputFocused: boolean = false;
  isShapeInputFocused: boolean = false;
  onlyNumbers = new RegExp('^[0-9]{1,3}$');

  constructor(
    private infrastructureMapService: InfrastructureMapService,
    private infrastructureRestService: InfrastructureRestService,
    private infrastructureService: InfrastructureService,
    private fb: FormBuilder,
  ) {
  }

  @HostListener('document:keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    switch (event.code) {
      case 'Space':
        if (!this.isShapeInputFocused && !this.isDegreeInputFocused) {
          let degree = this.areaForm.get('degree').value;
          this.areaForm.get('degree').setValue(degree >= 360 ? 0 : degree + 90);
        }
      break;
    }
  }

  ngOnInit(): void {
    this.subscriptions$.add(this.infrastructureMapService.triggerAreaForm.subscribe(({data, existing}) => {      
      if (data?.type === this.type) {
        return;
      }

      if (!data || data?.type === 'WORK') {
        this.show = false;
        return;
      }
      if (data?.type === 'ANCHOR' || data?.type === 'CAMERA') {
        this.type = data?.type;
        
        if (existing) {
          this.initDevicesControl(data.deviceID);
        } else {
          this.initDevicesControl();
        }
        return;
      }
      this.data = data;
      this.existing = existing;
      if (data && data.type) {
        this.shapeType = data.type;
      }
      this.initAreaForm();

      this.show = true;
    }));

    this.subscriptions$.add(this.infrastructureMapService.modeSetted.subscribe(mode => {
      if (!mode) {
        this.existing = false;
      }
    }));
  }

  initAreaForm(): void {
    const {name, backgroundColor} = this.data || {};
    this.areaForm = this.fb.group({
      name: [name ? name?.trim() : null, [Validators.required, Validators.maxLength(50)]],
      degree: [this.data?.shape?.rotation || 0, 
                [Validators.required, Validators.maxLength(3), Validators.max(360), Validators.min(-360), Validators.pattern(this.onlyNumbers)]
              ],
      backgroundColor: [this.data && this.data.shape && this.data.shape.styling && this.data.shape.styling.backgroundColor
      || (this.shapeType === AreaType.RESTRICTED
        ? '#eeeeee'
        : backgroundColor
          ? backgroundColor
          : '#dcbc65'), Validators.required],
    });

    this.subscriptions$.add(this.areaForm.valueChanges.pipe(
      debounceTime(100),
      distinctUntilChanged()
    ).subscribe(value => {
      const isOnlySpaces = value?.name?.trim() === '';
      const isFormValid = isOnlySpaces ? false : this.areaForm.valid;

      this.infrastructureMapService.onAreaFormUpdated({...value, isFormValid: isFormValid});
    }));
  }

  toggleColorPicker(): void {
    if (this.colorPickerOpened) {
      return;
    }
    this.colorPicker.openDialog();
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  initDevicesControl(deviceID?: string): void {
    this.subscriptions$.add(this.infrastructureService.infrastructureId.subscribe(id => {
      const filter = {
        infrastructure: id,
        typeNames: [this.type],
      };
      this.infrastructureRestService.searchDevices(filter).pipe(take(1), map(devices => {
        return devices.filter(device => device._id === deviceID || !device.floor);
      })).subscribe(devices => {
        this.devices = devices;
        
        this.devicesControl = new FormControl(deviceID ? this.getDeviceId(this.devices, deviceID) : null);
        this.deviceControlSubscription$ = this.devicesControl.valueChanges.subscribe(device => {
          this.infrastructureMapService.onAreaFormUpdated({
            type: this.type,
            device: this.devices.find(({_id}) => _id === device),
            isFormValid: !!device
          });
        });
        this.show = true;
      });
    }));
  }

  getDeviceId(devices: any, device: string) {
    let d = devices.find(({_id}) => _id === device);
    return d._id;
  }

  onFocus(value: boolean) {
    this.isShapeInputFocused = value;
  }

  onDegreeInputFocus(value: boolean) {
    this.isDegreeInputFocused = value;
  }

  get backgroundInputValue() {
    return this.areaForm.get('backgroundColor').value as any;
  }

  set backgroundInputValue(val: any) {
    this.areaForm.get('backgroundColor').setValue(val);
  }

  ngOnDestroy(): void {
      try {
        this.subscriptions$.unsubscribe(); 
      } catch (e) {
      }
  }
}
