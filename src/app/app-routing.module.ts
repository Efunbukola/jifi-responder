import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RouteNames } from './route-names';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OnlineComponent } from './pages/online/online.component';
import { IncidentDetailComponent } from './pages/incident-detail/incident-detail.component';


const routes: Routes = [
  {
    path: RouteNames.Dashboard,          // e.g. '/d'
    component: DashboardComponent,
    children: [
    {path: RouteNames.Online,
    component: OnlineComponent},
    ]
  },
  { path: RouteNames.Details,
    component: IncidentDetailComponent },
  { path: '**', redirectTo: 'd/online' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}

