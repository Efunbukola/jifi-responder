import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RouteNames } from './route-names';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OnlineComponent } from './pages/online/online.component';
import { IncidentDetailComponent } from './pages/incident-detail/incident-detail.component';
import { UnauthGuard } from './gaurds/unauth.guard';
import { LoginComponent } from './pages/login/login.component';
import { ResponderProfileComponent } from './pages/responder-profile/responder-profile.component';
import { SignupComponent } from './pages/signup/signup.component';
import { AuthGuard } from './gaurds/auth.guard';


const routes: Routes = [

  { path: 'login', component: LoginComponent, canActivate: [UnauthGuard] }, 

  { path: 'signup', component: SignupComponent, canActivate: [UnauthGuard] },

  {
    path: RouteNames.Dashboard,
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'online', pathMatch: 'full' }, // ✅ default child route
      { path: 'online', component: OnlineComponent },
      { path: 'profile', component: ResponderProfileComponent },
    ],
  },

  { path: RouteNames.Details,
    component: IncidentDetailComponent },

  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
