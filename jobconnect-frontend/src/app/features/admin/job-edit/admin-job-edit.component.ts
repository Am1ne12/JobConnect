import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../../core/services/config.service';
import { SkillService } from '../../../core/services/skill.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Skill, JobType, JobPosting, JobStatus } from '../../../core/models';
import { CustomDropdownComponent, DropdownOption } from '../../../shared/components/custom-dropdown/custom-dropdown.component';

@Component({
    selector: 'app-admin-job-edit',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, CustomDropdownComponent],
    templateUrl: './admin-job-edit.component.html',
    styleUrl: './admin-job-edit.component.scss'
})
export class AdminJobEditComponent implements OnInit {
    @Input() id!: string;

    jobForm!: FormGroup;
    job = signal<JobPosting | null>(null);
    skills = signal<Skill[]>([]);
    selectedSkills = signal<number[]>([]);
    loading = signal(true);
    saving = signal(false);
    error = signal<string | null>(null);
    selectedStatus = signal<JobStatus>(JobStatus.Draft);

    readonly jobTypeOptions: DropdownOption[] = [
        { value: 'FullTime', label: 'Full Time', icon: '💼' },
        { value: 'PartTime', label: 'Part Time', icon: '⏰' },
        { value: 'Contract', label: 'Contract', icon: '📝' },
        { value: 'Internship', label: 'Internship', icon: '🎓' },
        { value: 'Remote', label: 'Remote', icon: '🏠' }
    ];

    readonly currencyOptions: DropdownOption[] = [
        { value: 'EUR', label: 'EUR - Euro', icon: '€' },
        { value: 'USD', label: 'USD - US Dollar', icon: '$' },
        { value: 'GBP', label: 'GBP - British Pound', icon: '£' },
        { value: 'CAD', label: 'CAD - Canadian Dollar', icon: '$' },
        { value: 'AUD', label: 'AUD - Australian Dollar', icon: '$' }
    ];

    get jobId(): number {
        return parseInt(this.id);
    }

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private configService: ConfigService,
        private skillService: SkillService,
        private notificationService: NotificationService,
        private router: Router,
        private location: Location
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.skillService.getSkills().subscribe(skills => {
            this.skills.set(skills);
        });

        // Use public job endpoint to get job details
        this.http.get<JobPosting>(`${this.configService.apiUrl}/jobs/${this.jobId}`).subscribe({
            next: (job) => {
                this.job.set(job);
                this.populateForm(job);
                // Set the selected status based on current job status
                if (job.status === 'Draft') {
                    this.selectedStatus.set(JobStatus.Draft);
                } else if (job.status === 'Published') {
                    this.selectedStatus.set(JobStatus.Published);
                } else if (job.status === 'Closed') {
                    this.selectedStatus.set(JobStatus.Closed);
                }
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Failed to load job data');
                this.loading.set(false);
            }
        });
    }

    private initForm() {
        this.jobForm = this.fb.group({
            title: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', [Validators.required, Validators.minLength(50)]],
            requirements: [''],
            benefits: [''],
            location: [''],
            type: ['FullTime', Validators.required],
            salaryMin: [null],
            salaryMax: [null],
            salaryCurrency: ['EUR'],
            experienceYearsMin: [0],
            experienceYearsMax: [null]
        });
    }

    private populateForm(job: JobPosting) {
        this.jobForm.patchValue({
            title: job.title,
            description: job.description,
            requirements: job.requirements || '',
            benefits: job.benefits || '',
            location: job.location || '',
            type: job.jobType || 'FullTime',
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency || 'EUR',
            experienceYearsMin: job.experienceYearsMin || 0,
            experienceYearsMax: job.experienceYearsMax
        });

        if (job.requiredSkills) {
            this.selectedSkills.set(job.requiredSkills.map(s => s.skillId));
        }
    }

    setStatus(status: JobStatus) {
        this.selectedStatus.set(status);
    }

    // Expose JobStatus enum to template
    readonly JobStatus = JobStatus;

    private getStatusString(): string {
        const status = this.selectedStatus();
        if (status === JobStatus.Published) return 'Published';
        if (status === JobStatus.Closed) return 'Closed';
        return 'Draft';
    }

    toggleSkill(skillId: number) {
        const current = this.selectedSkills();
        if (current.includes(skillId)) {
            this.selectedSkills.set(current.filter(id => id !== skillId));
        } else {
            this.selectedSkills.set([...current, skillId]);
        }
    }

    isSkillSelected(skillId: number): boolean {
        return this.selectedSkills().includes(skillId);
    }

    submit() {
        if (this.jobForm.invalid) {
            this.jobForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.error.set(null);

        const formValue = this.jobForm.value;
        const jobData = {
            title: formValue.title,
            description: formValue.description,
            requirements: formValue.requirements || undefined,
            benefits: formValue.benefits || undefined,
            location: formValue.location || undefined,
            type: formValue.type,
            salaryMin: formValue.salaryMin || undefined,
            salaryMax: formValue.salaryMax || undefined,
            salaryCurrency: formValue.salaryCurrency || undefined,
            experienceYearsMin: formValue.experienceYearsMin || undefined,
            experienceYearsMax: formValue.experienceYearsMax || undefined,
            status: this.getStatusString(),
            requiredSkills: this.selectedSkills().map(skillId => ({
                skillId,
                isRequired: true
            }))
        };

        // Use admin endpoint
        this.http.put(`${this.configService.apiUrl}/jobs/admin/${this.jobId}`, jobData).subscribe({
            next: () => {
                this.saving.set(false);
                let message = 'Job saved as draft successfully!';
                if (this.selectedStatus() === JobStatus.Published) {
                    message = 'Job updated and published successfully!';
                } else if (this.selectedStatus() === JobStatus.Closed) {
                    message = 'Job has been closed successfully!';
                }
                this.notificationService.success(message);
                this.router.navigate(['/admin/jobs']);
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(err.error?.message || 'Failed to update job. Please try again.');
                this.notificationService.error('Failed to update job. Please try again.');
            }
        });
    }

    getFieldError(fieldName: string): string | null {
        const control = this.jobForm.get(fieldName);
        if (control?.touched && control?.errors) {
            if (control.errors['required']) return 'This field is required';
            if (control.errors['minlength']) {
                return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
            }
        }
        return null;
    }

    goBack() {
        this.location.back();
    }
}
