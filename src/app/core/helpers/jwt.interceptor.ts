import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { browser } from 'protractor';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        const shareBookUser = JSON.parse(localStorage.getItem('shareBookUser'));
        if (shareBookUser && shareBookUser.accessToken) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${shareBookUser.accessToken}`
                }
            });
        }

        return next.handle(request);
    }
}
