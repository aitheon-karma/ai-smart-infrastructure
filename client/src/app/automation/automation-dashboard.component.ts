import { Component, OnInit, OnDestroy } from '@angular/core';
import { InfrastructureService } from '../infrastructures/infrastructure.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ai-automation-dashboard',
  template: `
      <ai-automation *ngIf="infrastructureId"
                     [infrastructureId]="infrastructureId"></ai-automation>
  `,
})
export class AutomationDashboardComponent implements OnInit, OnDestroy {
  infrastructureId: string;
  infrastructureSubscription: Subscription;

  constructor(
    private infrastructureService: InfrastructureService,
  ) {}

  ngOnInit(): void {
    this.infrastructureSubscription = this.infrastructureService.infrastructureId.asObservable()
      .subscribe(infrastructureId => {
        this.infrastructureId = infrastructureId;
      });
  }

  ngOnDestroy(): void {
    if (this.infrastructureSubscription) {
      this.infrastructureSubscription.unsubscribe();
    }
  }
}
