import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShapeDropdownMenuComponent } from './shape-dropdown-menu.component';

describe('ShapeDropdownMenuComponent', () => {
  let component: ShapeDropdownMenuComponent;
  let fixture: ComponentFixture<ShapeDropdownMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShapeDropdownMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShapeDropdownMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
