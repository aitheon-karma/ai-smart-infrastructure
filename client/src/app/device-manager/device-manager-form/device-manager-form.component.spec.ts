import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceManagerFormComponent } from './device-manager-form.component';

describe('DeviceManagerFormComponent', () => {
  let component: DeviceManagerFormComponent;
  let fixture: ComponentFixture<DeviceManagerFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceManagerFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceManagerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
