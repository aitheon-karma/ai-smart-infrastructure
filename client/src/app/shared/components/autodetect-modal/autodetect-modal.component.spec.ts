import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AutodetectModalComponent } from './autodetect-modal.component';

describe('AutodetectModalComponent', () => {
  let component: AutodetectModalComponent;
  let fixture: ComponentFixture<AutodetectModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AutodetectModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AutodetectModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
