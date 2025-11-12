import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.token;

     // Skip adding Authorization header for external/public URLs
    if (
      req.url.includes('https://api.cloudinary.com') ||
      req.url.includes('http://localhost:8080/live')
    ) {
      return next.handle(req);
    }

    // ✅ Add auth token for your backend requests
    if (token) {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}
