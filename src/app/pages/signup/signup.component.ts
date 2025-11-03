import { Component } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  standalone: false
})
export class SignupComponent {
  loading = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;

  form = this.fb.group(
    {
      et_type: ['', Validators.required],
      full_name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      transportation_method: ['', Validators.required], // ✅ new field
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required],
      occupation: [''],
      company: [''],
      education_level: [''],
      city: [''],
      state: [''],
      zip_code: [''],
      secret_question: ['', Validators.required],
      secret_answer: ['', Validators.required],
    },
    { validators: [SignupComponent.passwordsMatchValidator] }
  );

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirm_password')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const formValue = { ...this.form.value };
    delete formValue.confirm_password;

    this.auth.signup(formValue).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/d/online']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Signup failed';
      },
    });
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  get passwordMismatch(): boolean {
    return this.form.hasError('passwordMismatch') && this.form.get('confirm_password')?.touched!;
  }
}
