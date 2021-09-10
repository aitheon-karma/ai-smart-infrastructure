import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NoPermissionToPayModalComponent } from './no-permission-to-pay-modal.component';

describe('NoPermissionToPayModalComponent', () => {
  let component: NoPermissionToPayModalComponent;
  let fixture: ComponentFixture<NoPermissionToPayModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NoPermissionToPayModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NoPermissionToPayModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
