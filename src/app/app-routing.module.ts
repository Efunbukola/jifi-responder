import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RouteNames } from './route-names';
import { MainBluetoothPageComponent } from './pages/main-bluetooth-page/main-bluetooth-page.component';
import { OnlineComponent } from './pages/online/online.component';
import { IncidentDetailComponent } from './pages/incident-detail/incident-detail.component';

const routes: Routes = [
  
  {
    path: RouteNames.Online,
    component: OnlineComponent,
    children: [
      
    ],
    canActivate: []
  },
  { path: RouteNames.Details,
    component: IncidentDetailComponent },
  { path: '**', redirectTo: 'online' },
  
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
