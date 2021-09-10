import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from '@aitheon/core-client';
import { InfrastructuresFormComponent } from './infrastructures/infrastructures-form/infrastructures-form.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full', canActivate: [AuthGuard] },
  {
    path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'automation', loadChildren: () => import('./automation/automation.module').then(m => m.AutomationModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module')
      .then(({ AdminModule }) => AdminModule),
  },
  {
    path: 'activity',
    loadChildren: () => import('./activity/activity.module').then(({ ActivityModule }) => ActivityModule),
  },
  { path: 'infrastructure/new', component: InfrastructuresFormComponent },
  {
    path: 'infrastructure/:id',
    loadChildren: () => import('./infrastructures/infrastructures.module')
      .then(({ InfrastructuresModule }) => InfrastructuresModule),
  },
  {
    path: 'applications',
    loadChildren: () => import('./application-dashboard/application-dashboard.module')
      .then((({ ApplicationDashboardModule }) => ApplicationDashboardModule))
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule {
}
