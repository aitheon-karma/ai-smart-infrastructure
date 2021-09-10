import { Component, OnInit, Output, Input, OnDestroy, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { BillingClientService } from '../../services/billing-client.service';

@Component({
  selector: 'ai-billing-payment-section',
  templateUrl: './billing-payment-section.component.html',
  styleUrls: ['./billing-payment-section.component.scss']
})
export class BillingPaymentSectionComponent implements OnInit, OnDestroy {
  @Input() type: string;
  @Output() paymentFormData: EventEmitter<{accountId: string, agreeTerms: boolean}> = new EventEmitter<{accountId: string, agreeTerms: boolean}>();

  constructor(private fb: FormBuilder, private billingService: BillingClientService) { }
  perItem = 11; // Hardcoded Value
  perMonth = 20; // Hardcoded Value
  totalPrice: number;
  accounts: any[] = [];
  subscriptionForm: FormGroup;
  subscriptions: Subscription[] = [];
  defaultAccount: any;
  currentYear = new Date().getFullYear();
  currentMonth = new Date().toLocaleString('default', { month: 'long' });

  ngOnInit(): void {
    this.buildForm();

    this.subscriptions.push(this.billingService.getUserAccounts().subscribe((data: { userAccounts: any, defaultUserAccount: any }) => {
      this.accounts = data?.userAccounts;
      if (this.subscriptionForm && !this.subscriptionForm.value.accountId) {
        this.defaultAccount = data?.defaultUserAccount;
        this.subscriptionForm.get('accountId')
          .setValue(this.defaultAccount ? this.defaultAccount.value : this.accounts?.length ? this.accounts[0].value : null);
      }
    }));
    this.totalPrice = this.perItem + this.perMonth;
  }

  buildForm() {
    this.defaultAccount = this.accounts && this.accounts.find(a => a.default);
    this.subscriptionForm = this.fb.group({
      accountId: [this.defaultAccount ? this.defaultAccount.value : this.accounts.length ? this.accounts[0].value : null],
      agreeTerms: [false, Validators.requiredTrue]
    });
    this.subscriptions.push(this.subscriptionForm.get('accountId')
      .valueChanges.pipe(distinctUntilChanged(), debounceTime(200))
      .subscribe(accountId => {
        this.paymentFormData.emit(this.subscriptionForm.value); // Send Form Data to Parent
      }));
    this.subscriptions.push(this.subscriptionForm.get('agreeTerms')
      .valueChanges.pipe(distinctUntilChanged(), debounceTime(200))
      .subscribe(agreeTermsStatus => {
        this.paymentFormData.emit(this.subscriptionForm.value); // Send Form Data to Parent
      }));
  }

  get daysInMonth() {
    return new Date(this.currentYear, new Date().getMonth(), 0).getDate();
  }

  ngOnDestroy() {
    try {
      for (const subscription of this.subscriptions) {
        subscription.unsubscribe();
      }
    } catch (e) { }
  }

}
