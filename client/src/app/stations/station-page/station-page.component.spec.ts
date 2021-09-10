import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StationPageComponent } from './station-page.component';

describe('StationPageComponent', () => {
  let component: StationPageComponent;
  let fixture: ComponentFixture<StationPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StationPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
