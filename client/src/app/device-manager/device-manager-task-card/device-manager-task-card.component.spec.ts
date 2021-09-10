import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceManagerTaskCardComponent } from './device-manager-task-card.component';

describe('DeviceManagerTaskCardComponent', () => {
  let component: DeviceManagerTaskCardComponent;
  let fixture: ComponentFixture<DeviceManagerTaskCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceManagerTaskCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceManagerTaskCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
