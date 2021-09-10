import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PickPackStationsComponent } from './pick-pack-stations.component';

describe('PickPackStationsComponent', () => {
  let component: PickPackStationsComponent;
  let fixture: ComponentFixture<PickPackStationsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PickPackStationsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PickPackStationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
