import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceManagerCardComponent } from './device-manager-card.component';

describe('DeviceManagerCardComponent', () => {
  let component: DeviceManagerCardComponent;
  let fixture: ComponentFixture<DeviceManagerCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceManagerCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceManagerCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
