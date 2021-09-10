import { Injectable, Inject } from '@angular/core';
import { RestService, AuthService } from '@aitheon/core-client';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BillingClientService {

  constructor(private restService: RestService,
              private authService: AuthService) {
  }
  private absUrl = true;
  private baseApi = `https://${this.authService.baseHost() || 'dev.aitheon.com'}/billing-manager`;
  private userAccountsDataSubject = new BehaviorSubject<{ userAccounts: any, defaultUserAccount: any }>(null);

  userAccountsData$: Observable<{ userAccounts: any, defaultUserAccount: any }> = this.userAccountsDataSubject.asObservable();

  listActiveInboundFiatAccounts() {
    return this.restService.fetch(`${this.baseApi}/api/treasury/fiat-accounts/inbound`, undefined, this.absUrl);
  }

  getUserAccounts(): Observable<{ userAccounts: any, defaultUserAccount: any }> {
    return this.listActiveInboundFiatAccounts().pipe(map(accounts => {
      const userAccounts = accounts.map(a => (
        {
          name: `**** **** **** ${a.inboundProvider?.blueSnap?.cardInfo?.lastFourDigits || a.lastDigits}`,
          value: a._id,
          default: a.defaultSending
        }
      ));
      const defaultUserAccount = userAccounts && userAccounts.find(a => a.default);

      const data = { userAccounts, defaultUserAccount }

      this.userAccountsDataSubject.next(data);

      return data;
    }), catchError(error => {
      console.error(error?.message || error);

      return of(null);
    }));
  }
}
