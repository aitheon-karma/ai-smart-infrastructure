import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddFloorFormComponent } from './add-floor-form.component';

describe('AddFloorFormComponent', () => {
  let component: AddFloorFormComponent;
  let fixture: ComponentFixture<AddFloorFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddFloorFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddFloorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
