import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceManagerDetailsComponent } from './device-manager-details.component';

describe('DeviceManagerDetailsComponent', () => {
  let component: DeviceManagerDetailsComponent;
  let fixture: ComponentFixture<DeviceManagerDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceManagerDetailsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceManagerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
