import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FloorsListComponent } from './floors-list.component';

describe('FloorsListComponent', () => {
  let component: FloorsListComponent;
  let fixture: ComponentFixture<FloorsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FloorsListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FloorsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
