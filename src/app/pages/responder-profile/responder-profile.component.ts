import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

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

 form = this.fb.group({
  full_name: ['', Validators.required],
  username: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
  transportation_method: ['', Validators.required], // ✅ added
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

  constructor(private fb: FormBuilder, private http: HttpClient, private auth:AuthService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    this.http.get(`${environment.api_url}api/responders/me`).subscribe({
      next: (res: any) => {
        const data = res.user || res;
        this.form.patchValue(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load responder profile:', err);
        this.loading = false;
      },
    });
  }

  saveProfile() {
    if (this.form.invalid) return;
    this.loading = true;
    this.http.put(`${environment.api_url}api/responders/update-profile`, this.form.value).subscribe({
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

  updatePassword() {
    if (this.passwordForm.invalid) return;
    this.loading = true;
    this.http.put(`${environment.api_url}api/responders/update-password`, this.passwordForm.value).subscribe({
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

  signOut() {
    this.auth.logout();
  }

  togglePasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }
}
