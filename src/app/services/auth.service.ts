import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

export interface ResponderAuthUser {
  token: string;
  responderId: string;
  username: string;
  email: string;
  full_name?: string;
  et_type?: 'human' | 'robot';
  emergency_skills?: any[];
  education_level?: string;
  certifications?: string[];
  occupation?: string;
  company?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  online?: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentResponderSubject = new BehaviorSubject<ResponderAuthUser | null>(null);
  currentResponder$ = this.currentResponderSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('responder_auth');

    if (stored) {
      const savedUser: ResponderAuthUser = JSON.parse(stored);
      this.currentResponderSubject.next(savedUser);

      // refresh profile after initialization
      Promise.resolve().then(() => {
        this.refreshResponderProfile(savedUser.token);
      });
    }
  }

  /** 🧾 Sign up */
  signup(data: any) {
    return this.http
      .post<any>(`${environment.api_url}api/responders/signup`, data)
      .pipe(
        tap((res) => {
          if (res.token) this.setSession(res);
        })
      );
  }

  /** Login */
  login(email: string, password: string) {
    return this.http
      .post<any>(`${environment.api_url}api/responders/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.token) this.setSession(res);
        })
      );
  }

  /** Get current responder profile */
  fetchProfile() {
    return this.http.get<any>(`${environment.api_url}api/responders/profile`);
  }

  /** Refresh stored user with live data */
  private refreshResponderProfile(token: string) {
    this.http
      .get<any>(`${environment.api_url}api/responders/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (data) => {
          const updatedUser: ResponderAuthUser = {
            ...data,
            token,
            responderId: data.responderId || data.user?.responderId,
          };

          this.currentResponderSubject.next(updatedUser);
          localStorage.setItem('responder_auth', JSON.stringify(updatedUser));
        },
        error: (err) => {
          console.warn('Failed to refresh responder profile:', err);
          if (err.status === 401) this.logout();
        },
      });
  }

  /** Logout */
  logout() {
    localStorage.removeItem('responder_auth');
    this.currentResponderSubject.next(null);
    this.router.navigate(['/responder-login']);
  }

  /** Save session after login/signup */
  private setSession(res: any) {
    const responder: ResponderAuthUser = {
      token: res.token,
      responderId: res.responderId,
      username: res.username,
      email: res.email,
    };

    localStorage.setItem('responder_auth', JSON.stringify(responder));
    this.currentResponderSubject.next(responder);

    // Refresh with full profile
    this.refreshResponderProfile(res.token);
  }

  /** Get JWT token */
  get token(): string | null {
    const stored = localStorage.getItem('responder_auth');
    return stored ? JSON.parse(stored).token : null;
  }

  /** Is authenticated */
  get isAuthenticated(): boolean {
    return !!this.token;
  }

  /** Get current responder object */
  getResponder(): ResponderAuthUser | null {
    const responder = this.currentResponderSubject.value;
    if (responder) return responder;

    const stored = localStorage.getItem('responder_auth');
    return stored ? JSON.parse(stored) : null;
  }

  /** Alias for token */
  getToken(): string | null {
    return this.token;
  }
}
