import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BillingPaymentSectionComponent } from './billing-payment-section.component';

describe('BillingPaymentSectionComponent', () => {
  let component: BillingPaymentSectionComponent;
  let fixture: ComponentFixture<BillingPaymentSectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BillingPaymentSectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BillingPaymentSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
