import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RouteNames } from './route-names';
import { MainBluetoothPageComponent } from './pages/main-bluetooth-page/main-bluetooth-page.component';
import { OnlineComponent } from './pages/online/online.component';

const routes: Routes = [
  
  {
    path: RouteNames.MainBluetoothPage,
    component: OnlineComponent,
    children: [
      
    ],
    canActivate: []
  },
  
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
