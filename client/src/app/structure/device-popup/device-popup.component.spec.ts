import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DevicePopupComponent } from './device-popup.component';

describe('DevicePopupComponent', () => {
  let component: DevicePopupComponent;
  let fixture: ComponentFixture<DevicePopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DevicePopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DevicePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
