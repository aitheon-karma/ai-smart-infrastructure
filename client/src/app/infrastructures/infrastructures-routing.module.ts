import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InfrastructuresDashboardComponent } from './infrastructures-dashboard/infrastructures-dashboard.component';
import { InfrastructuresFormComponent } from './infrastructures-form/infrastructures-form.component';
import { InfrastructureComponent } from './infrastructure/infrastructure.component';

const routes: Routes = [
  {
    path: '', component: InfrastructureComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: InfrastructuresDashboardComponent },
      {
        path: 'automation',
        loadChildren: () => import('../automation/automation.module').then(m => m.AutomationModule)
      },
      {
        path: 'structure',
        loadChildren: () => import('../structure/structure.module').then(({ StructureModule }) => StructureModule),
      },
      {
        path: 'items',
        loadChildren: () => import('../item-manager/item-manager.module')
          .then(({ ItemManagerModule }) => ItemManagerModule),
      },
      {
        path: 'item-manager',
        loadChildren: () => import('../item-manager/item-manager.module')
          .then(({ ItemManagerModule }) => ItemManagerModule),
      },
      {
        path: 'tasks',
        loadChildren: () => import('../tasks/tasks.module').then(({ TasksModule }) => TasksModule),
      },
      {
        path: 'stations',
        loadChildren: () => import('../stations/stations.module').then(({ StationsModule }) => StationsModule),
      },
      {
        path: 'device-manager',
        loadChildren: () => import('../device-manager/device-manager.module').then(({ DeviceManagerModule }) => DeviceManagerModule),
      },
      {
        path: 'settings',
        component: InfrastructuresFormComponent,
      },
      { path: 'edit', component: InfrastructuresFormComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InfrastructuresRoutingModule { }
