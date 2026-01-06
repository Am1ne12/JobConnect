import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfigService } from '../../../core/services/config.service';

interface AdminUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

@Component({
    selector: 'app-admin-user-edit',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-user-edit.component.html',
    styleUrl: './admin-user-edit.component.scss'
})
export class AdminUserEditComponent implements OnInit {
    @Input() id?: string;

    userForm!: FormGroup;
    loading = signal(true);
    saving = signal(false);
    isNewUser = signal(false);
    user = signal<AdminUser | null>(null);

    roles = [
        { value: 'Candidate', label: 'Candidate', icon: '👤', description: 'Can apply for jobs' },
        { value: 'Company', label: 'Company', icon: '🏢', description: 'Can post jobs' },
        { value: 'Admin', label: 'Admin', icon: '🛡️', description: 'Full access' }
    ];

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private notificationService: NotificationService,
        private configService: ConfigService,
        private router: Router,
        private location: Location
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.isNewUser.set(!this.id);
        this.loadData();
    }

    private initForm() {
        this.userForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: [''],
            email: ['', [Validators.required, Validators.email]],
            password: [''],
            role: ['Candidate', Validators.required]
        });
    }

    private loadData() {
        this.loading.set(true);

        if (this.id) {
            this.http.get<AdminUser>(`${this.configService.apiUrl}/admin/users/${this.id}`).subscribe({
                next: (user) => {
                    this.user.set(user);
                    this.userForm.patchValue({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role
                    });
                    this.loading.set(false);
                },
                error: () => {
                    this.notificationService.error('Failed to load user');
                    this.loading.set(false);
                }
            });
        } else {
            // New user - require password
            this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
            this.userForm.get('password')?.updateValueAndValidity();
            this.loading.set(false);
        }
    }

    saveUser() {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        const formValue = this.userForm.value;

        if (this.id) {
            // Update existing user
            const updateData: any = {
                firstName: formValue.firstName,
                lastName: formValue.lastName || null,
                email: formValue.email
            };

            // Only include password if provided
            if (formValue.password) {
                updateData.password = formValue.password;
            }

            this.http.put(`${this.configService.apiUrl}/admin/users/${this.id}`, updateData).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.notificationService.success('User updated successfully!');
                    this.router.navigate(['/admin/users']);
                },
                error: (err) => {
                    this.saving.set(false);
                    this.notificationService.error(err.error?.message || 'Failed to update user');
                }
            });
        } else {
            // Create new user
            const createData = {
                firstName: formValue.firstName,
                lastName: formValue.lastName || null,
                email: formValue.email,
                password: formValue.password,
                role: formValue.role
            };

            this.http.post<AdminUser>(`${this.configService.apiUrl}/admin/users`, createData).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.notificationService.success('User created successfully!');
                    this.router.navigate(['/admin/users']);
                },
                error: (err) => {
                    this.saving.set(false);
                    this.notificationService.error(err.error?.message || 'Failed to create user');
                }
            });
        }
    }

    goBack() {
        this.location.back();
    }
}
