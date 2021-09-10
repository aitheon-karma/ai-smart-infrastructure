import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DevicePanelComponent } from './device-panel.component';

describe('DevicePanelComponent', () => {
  let component: DevicePanelComponent;
  let fixture: ComponentFixture<DevicePanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DevicePanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DevicePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
