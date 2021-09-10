import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AreasToolbarComponent } from './areas-toolbar.component';

describe('AreasToolbarComponent', () => {
  let component: AreasToolbarComponent;
  let fixture: ComponentFixture<AreasToolbarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AreasToolbarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AreasToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
