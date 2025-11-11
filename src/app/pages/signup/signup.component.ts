import { Component } from '@angular/core';
import {
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormArray,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  standalone: false,
})
export class SignupComponent {
  loading = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  /** Reactive form setup */
  form = this.fb.group(
    {
      et_type: ['', Validators.required],
      full_name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      transportation_method: ['', Validators.required],
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

      /** 🧩 Add FormArray for skills */
      emergency_skills: this.fb.array([]),
    },
    { validators: [SignupComponent.passwordsMatchValidator] }
  );

  /** Password validator */
  static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirm_password')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  /** FormArray getter for skills */
  get emergency_skills(): FormArray {
    return this.form.get('emergency_skills') as FormArray;
  }

  /** Add skill row */
  addSkill() {
    const skillGroup = this.fb.group({
      name: ['', Validators.required],
      proficiency: ['Beginner', Validators.required],
    });
    this.emergency_skills.push(skillGroup);
  }

  /** Remove skill row */
  removeSkill(index: number) {
    this.emergency_skills.removeAt(index);
  }

  /** Submit signup form */
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

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordMismatch(): boolean {
    return (
      this.form.hasError('passwordMismatch') &&
      this.form.get('confirm_password')?.touched!
    );
  }
}
