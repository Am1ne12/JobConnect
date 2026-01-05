import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserRole } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = `${environment.apiUrl}/auth`;

    private tokenSignal = signal<string | null>(localStorage.getItem('token'));
    private userSignal = signal<AuthResponse | null>(this.loadUserFromStorage());

    readonly isAuthenticated = computed(() => !!this.tokenSignal());
    readonly currentUser = computed(() => this.userSignal());
    readonly userRole = computed(() => this.userSignal()?.role as UserRole | null);
    readonly isCandidate = computed(() => this.userRole() === UserRole.Candidate);
    readonly isCompany = computed(() => this.userRole() === UserRole.Company);

    constructor(private http: HttpClient, private router: Router) { }

    private loadUserFromStorage(): AuthResponse | null {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.tokenSignal.set(null);
        this.userSignal.set(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return this.tokenSignal();
    }

    private handleAuthSuccess(response: AuthResponse): void {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response));
        this.tokenSignal.set(response.token);
        this.userSignal.set(response);
    }
}
