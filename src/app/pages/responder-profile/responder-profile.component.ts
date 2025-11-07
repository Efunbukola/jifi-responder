import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { loadConnectAndInitialize } from '@stripe/connect-js';


@Component({
  selector: 'app-responder-profile',
  templateUrl: './responder-profile.component.html',
  standalone: false
})
export class ResponderProfileComponent implements OnInit {
  loading = false;
  message = '';
  passwordMessage = '';
  showNewPassword = false;

  stripeConnected = false; // ✅ NEW: track if Stripe account already connected

  form = this.fb.group({
    full_name: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    transportation_method: ['', Validators.required],
    occupation: [''],
    company: [''],
    education_level: [''],
    city: [''],
    state: [''],
    zip_code: [''],
  });

  passwordForm = this.fb.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService
  ) {}

 ngOnInit(): void {
  this.loadProfile();
  this.checkStripeStatus();
}

  /** Load current profile */
  loadProfile() {
    this.loading = true;
    this.http.get(`${environment.api_url}api/responders/me`).subscribe({
      next: (res: any) => {
        const data = res.user || res;
        this.form.patchValue(data);

        // ✅ Check if Stripe account is already connected
        //this.stripeConnected = !!data.stripeAccountId;

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load responder profile:', err);
        this.loading = false;
      },
    });
  }

  /** 💾 Save profile updates */
  saveProfile() {
    if (this.form.invalid) return;
    this.loading = true;
    this.http
      .put(`${environment.api_url}api/responders/update-profile`, this.form.value)
      .subscribe({
        next: (res: any) => {
          this.message = res.message || 'Profile updated successfully';
          this.loading = false;
        },
        error: (err) => {
          console.error('Error saving responder profile:', err);
          this.loading = false;
        },
      });
  }

  /** 🔑 Update password */
  updatePassword() {
    if (this.passwordForm.invalid) return;
    this.loading = true;
    this.http
      .put(`${environment.api_url}api/responders/update-password`, this.passwordForm.value)
      .subscribe({
        next: (res: any) => {
          this.passwordMessage = res.message || 'Password updated successfully';
          this.passwordForm.reset();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error updating responder password:', err);
          this.passwordMessage = err.error?.error || 'Failed to update password';
          this.loading = false;
        },
      });
  }

  /** 🚪 Logout */
  signOut() {
    this.auth.logout();
  }

  togglePasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  async connectStripe() {

  this.loading = true;

  const user = this.auth.getResponder();

  if (!user?.responderId) {
    console.error('No responderId found');
    this.loading = false;
    return;
  }

  try {
    const res: any = await this.http
      .post(`${environment.api_url}api/payments/create-account-session`, {
        responderId: user.responderId,
      })
      .toPromise();

    console.log('Stripe session:', res);
    if (!res.clientSecret) throw new Error('No client secret returned');

    // Initialize the Connect JS instance
    const connect = await loadConnectAndInitialize({
      publishableKey: environment.stripe_public_key,
      fetchClientSecret: () => Promise.resolve(res.clientSecret),
      appearance: { },
    });

    console.log('connect', connect);

    const container = document.getElementById('stripe-onboarding-container');

    if (!container) throw new Error('Missing onboarding container');

    const accountOnboarding = connect.create('account-onboarding');

    accountOnboarding.setOnExit(() => {
      console.log('User exited the onboarding flow');
      this.checkStripeStatus(); // Refresh status
    });

    container.appendChild(accountOnboarding);

  } catch (err) {
    console.error('Error connecting to Stripe:', err);
  } finally {
    this.loading = false;
  }
}

async checkStripeStatus() {
  const user = this.auth.getResponder();
  if (!user?.responderId) return;

  try {
    const status: any = await this.http
      .get(`${environment.api_url}api/payments/account-status/${user.responderId}`)
      .toPromise();

    console.log('Stripe status:', status);
    this.stripeConnected = status.onboardingComplete;
  } catch (err) {
    console.error('Error checking Stripe status:', err);
  }
}


}
