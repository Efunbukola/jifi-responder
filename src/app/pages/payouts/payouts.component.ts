import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { loadConnectAndInitialize } from '@stripe/connect-js';

@Component({
  selector: 'app-payouts',
  templateUrl: './payouts.component.html',
  standalone:false
})
export class PayoutsComponent implements OnInit, OnDestroy {
  loading = false;
  stripeConnected = false;
  connectInstance: any;
  activeSection: 'balances' | 'payouts' = 'balances';

  constructor(private http: HttpClient, private auth: AuthService) {}

  async ngOnInit() {
    this.loading = true;
    await this.checkStripeStatus();
    if (this.stripeConnected) await this.loadDashboard();
    this.loading = false;
  }

  ngOnDestroy() {
    if (this.connectInstance) this.connectInstance.destroy();
  }

  async checkStripeStatus() {
    const user = this.auth.getResponder();
    if (!user?.responderId) return;

    try {
      const status: any = await this.http
        .get(`${environment.api_url}api/payments/account-status/${user.responderId}`)
        .toPromise();
      this.stripeConnected = status.onboardingComplete;
    } catch (err) {
      console.error('Error checking Stripe status:', err);
    }
  }

  async connectStripe() {
    this.loading = true;
    const user = this.auth.getResponder();
    if (!user?.responderId) return;

    try {
      const res: any = await this.http
        .post(`${environment.api_url}api/payments/create-account-session`, {
          responderId: user.responderId,
        })
        .toPromise();

      const connect = await loadConnectAndInitialize({
        publishableKey: environment.stripe_public_key,
        fetchClientSecret: () => Promise.resolve(res.clientSecret),
      });

      const container = document.getElementById('stripe-onboarding-container');
      container!.innerHTML = '';

      const accountOnboarding = connect.create('account-onboarding');

      accountOnboarding.setOnExit(() => {
        console.log('User exited the onboarding flow');
        this.checkStripeStatus(); // Refresh status
      });

      container!.appendChild(accountOnboarding);
    } catch (err) {
      console.error('Error connecting to Stripe:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadDashboard() {
    const user = this.auth.getResponder();
    if (!user?.responderId) return;

    try {
      const res: any = await this.http
        .post(`${environment.api_url}api/payments/create-account-session`, {
          responderId: user.responderId,
        })
        .toPromise();

      this.connectInstance = await loadConnectAndInitialize({
        publishableKey: environment.stripe_public_key,
        fetchClientSecret: () => Promise.resolve(res.clientSecret),
      });

      this.showSection(this.activeSection);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  }

  showSection(section: 'balances' | 'payouts') {
    this.activeSection = section;
    const container = document.getElementById('stripe-dashboard-container');
    if (!container || !this.connectInstance) return;

    container.innerHTML = '';
    const element = this.connectInstance.create(section);
    container.appendChild(element);
  }
}
