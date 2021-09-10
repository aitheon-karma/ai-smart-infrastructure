import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceManagerListComponent } from './device-manager-list.component';

describe('DeviceManagerListComponent', () => {
  let component: DeviceManagerListComponent;
  let fixture: ComponentFixture<DeviceManagerListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceManagerListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceManagerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
