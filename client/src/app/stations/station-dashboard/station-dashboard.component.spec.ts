import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StationDashboardComponent } from './station-dashboard.component';

describe('StationDashboardComponent', () => {
  let component: StationDashboardComponent;
  let fixture: ComponentFixture<StationDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StationDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StationDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
