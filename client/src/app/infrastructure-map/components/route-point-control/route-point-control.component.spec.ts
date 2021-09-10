import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RoutePointControlComponent } from './route-point-control.component';

describe('RoutePointControlComponent', () => {
  let component: RoutePointControlComponent;
  let fixture: ComponentFixture<RoutePointControlComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RoutePointControlComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RoutePointControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
