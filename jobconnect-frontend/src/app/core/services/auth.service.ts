import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, ChangeEmailRequest, ChangePasswordRequest, LoginRequest, RegisterRequest, UserRole } from '../models';
import { ConfigService } from './config.service';

interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    exp: number;
    iat?: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private get API_URL() { return `${this.configService.apiUrl}/auth`; }

    private tokenSignal = signal<string | null>(this.getValidToken());
    private userSignal = signal<AuthResponse | null>(this.loadUserFromStorage());

    readonly isAuthenticated = computed(() => !!this.tokenSignal() && !this.isTokenExpired());
    readonly currentUser = computed(() => this.userSignal());
    readonly userRole = computed(() => this.userSignal()?.role ?? null);
    readonly isCandidate = computed(() => this.userRole() === 'Candidate');
    readonly isCompany = computed(() => this.userRole() === 'Company');

    constructor(
        private http: HttpClient,
        private router: Router,
        private configService: ConfigService
    ) {
        // Validate token on service initialization
        this.validateStoredToken();
    }

    /**
     * Get the stored token, validating it's not expired
     */
    private getValidToken(): string | null {
        const token = localStorage.getItem('token');
        if (token && this.isTokenExpiredByValue(token)) {
            // Token is expired, clear it
            this.clearStorage();
            return null;
        }
        return token;
    }

    /**
     * Validate stored token on initialization and clear if expired
     */
    private validateStoredToken(): void {
        const token = localStorage.getItem('token');
        if (token && this.isTokenExpiredByValue(token)) {
            console.log('Stored token has expired, clearing auth state');
            this.clearStorage();
            this.tokenSignal.set(null);
            this.userSignal.set(null);
        }
    }

    /**
     * Decode a JWT token and return its payload
     */
    private decodeToken(token: string): JwtPayload | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            const payload = parts[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    }

    /**
     * Check if the current token is expired
     */
    isTokenExpired(): boolean {
        const token = this.tokenSignal();
        if (!token) {
            return true;
        }
        return this.isTokenExpiredByValue(token);
    }

    /**
     * Check if a specific token value is expired
     */
    private isTokenExpiredByValue(token: string): boolean {
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) {
            return true;
        }
        // exp is in seconds, Date.now() is in milliseconds
        // Add a 60-second buffer to handle clock skew
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        return currentTime >= expirationTime - 60000;
    }

    /**
     * Get the token expiration time in milliseconds
     */
    getTokenExpirationTime(): number | null {
        const token = this.tokenSignal();
        if (!token) {
            return null;
        }
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) {
            return null;
        }
        return payload.exp * 1000;
    }

    private loadUserFromStorage(): AuthResponse | null {
        const token = localStorage.getItem('token');
        // Don't load user if token is expired
        if (token && this.isTokenExpiredByValue(token)) {
            return null;
        }
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    }

    private clearStorage(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    register(request: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/register`, request)
            .pipe(tap(response => this.handleAuthSuccess(response)));
    }

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/login`, request)
            .pipe(tap(response => this.handleAuthSuccess(response)));
    }

    logout(): void {
        this.clearStorage();
        this.tokenSignal.set(null);
        this.userSignal.set(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return this.tokenSignal();
    }

    changeEmail(request: ChangeEmailRequest): Observable<AuthResponse> {
        return this.http.put<AuthResponse>(`${this.API_URL}/change-email`, request)
            .pipe(tap(response => this.handleAuthSuccess(response)));
    }

    changePassword(request: ChangePasswordRequest): Observable<{ message: string }> {
        return this.http.put<{ message: string }>(`${this.API_URL}/change-password`, request);
    }

    private handleAuthSuccess(response: AuthResponse): void {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response));
        this.tokenSignal.set(response.token);
        this.userSignal.set(response);
    }
}
