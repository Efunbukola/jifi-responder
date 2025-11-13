import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy, RouterModule } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ContainerComponent } from './components/container/container.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicStorageModule } from '@ionic/storage-angular';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AlertComponent } from './components/alert/alert.component';
import { AlertService } from './services/alert.service';
import { SearchPipe } from './pipes/search.pipe';
import { ModalService } from './services/modal.service';
import { ModalComponent } from './components/modal/modal.component';
import { SearchIPPipe } from './pipes/searchip.pipe';
import { MainBluetoothPageComponent } from './pages/main-bluetooth-page/main-bluetooth-page.component';
import { OnlineComponent } from './pages/online/online.component';
import { IncidentDetailComponent } from './pages/incident-detail/incident-detail.component';
import { MapsService } from './services/maps.service';
import { GoogleMapsModule } from '@angular/google-maps';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './gaurds/auth.guard';
import { UnauthGuard } from './gaurds/unauth.guard';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { ResponderProfileComponent } from './pages/responder-profile/responder-profile.component';
import { PayoutsComponent } from './pages/payouts/payouts.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';



@NgModule({
  declarations: [AppComponent,
    ContainerComponent,
    AlertComponent,
    ModalComponent,
    MainBluetoothPageComponent,
    OnlineComponent,
    IncidentDetailComponent,
    LoginComponent,
    SignupComponent,
    ResponderProfileComponent,
    PayoutsComponent,
    ResetPasswordComponent,
DashboardComponent],
  imports: [
    AppRoutingModule,
    HttpClientModule,
    BrowserModule,
    IonicModule.forRoot({ mode: 'md', scrollAssist: false }),
    IonicStorageModule.forRoot(),
    ReactiveFormsModule,
    FormsModule,
    GoogleMapsModule,
    CommonModule,
    SearchPipe
],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    AlertService, SearchPipe, ModalService, SearchIPPipe, MapsService, AuthService,
    AuthGuard,
    UnauthGuard,],
  bootstrap: [AppComponent],
})
export class AppModule {}
