import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemManagerListComponent } from './item-manager-list.component';

describe('ItemManagerListComponent', () => {
  let component: ItemManagerListComponent;
  let fixture: ComponentFixture<ItemManagerListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ItemManagerListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemManagerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
