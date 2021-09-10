import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceManagerDashboardComponent } from './device-manager-dashboard.component';

describe('DeviceManagerDashboardComponent', () => {
  let component: DeviceManagerDashboardComponent;
  let fixture: ComponentFixture<DeviceManagerDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceManagerDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceManagerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
