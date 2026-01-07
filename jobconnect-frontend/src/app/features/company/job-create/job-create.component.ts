import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { SkillService } from '../../../core/services/skill.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Skill, JobType, CreateJobRequest } from '../../../core/models';
import { CustomDropdownComponent, DropdownOption } from '../../../shared/components/custom-dropdown/custom-dropdown.component';

@Component({
    selector: 'app-job-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, CustomDropdownComponent],
    templateUrl: './job-create.component.html',
    styleUrl: './job-create.component.scss'
})
export class JobCreateComponent implements OnInit {
    jobForm!: FormGroup;
    skills = signal<Skill[]>([]);
    selectedSkills = signal<number[]>([]);
    saving = signal(false);
    error = signal<string | null>(null);
    publishNow = signal(false);

    readonly jobTypes = [
        { value: JobType.FullTime, label: 'Full Time' },
        { value: JobType.PartTime, label: 'Part Time' },
        { value: JobType.Contract, label: 'Contract' },
        { value: JobType.Internship, label: 'Internship' },
        { value: JobType.Remote, label: 'Remote' }
    ];

    readonly jobTypeOptions: DropdownOption[] = [
        { value: 'FullTime', label: 'Full Time', icon: '💼' },
        { value: 'PartTime', label: 'Part Time', icon: '⏰' },
        { value: 'Contract', label: 'Contract', icon: '📝' },
        { value: 'Internship', label: 'Internship', icon: '🎓' },
        { value: 'Remote', label: 'Remote', icon: '🏠' }
    ];

    readonly currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

    readonly currencyOptions: DropdownOption[] = [
        { value: 'EUR', label: 'EUR - Euro', icon: '€' },
        { value: 'USD', label: 'USD - US Dollar', icon: '$' },
        { value: 'GBP', label: 'GBP - British Pound', icon: '£' },
        { value: 'CAD', label: 'CAD - Canadian Dollar', icon: '$' },
        { value: 'AUD', label: 'AUD - Australian Dollar', icon: '$' }
    ];

    constructor(
        private fb: FormBuilder,
        private jobService: JobService,
        private skillService: SkillService,
        private notificationService: NotificationService,
        private router: Router
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.skillService.getSkills().subscribe(skills => {
            this.skills.set(skills);
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
            experienceYearsMin: [null],
            experienceYearsMax: [null]
        });
    }

    setPublishNow(value: boolean) {
        this.publishNow.set(value);
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
        const jobData: CreateJobRequest = {
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
            requiredSkills: this.selectedSkills().map(skillId => ({
                skillId,
                isRequired: true
            }))
        };

        this.jobService.createJob(jobData).subscribe({
            next: (job) => {
                if (this.publishNow()) {
                    this.jobService.publishJob(job.id).subscribe({
                        next: () => {
                            this.saving.set(false);
                            this.notificationService.success('Job created and published successfully!');
                            this.router.navigate(['/company/dashboard']);
                        },
                        error: () => {
                            this.saving.set(false);
                            this.notificationService.success('Job created! Publishing failed, saved as draft.');
                            this.router.navigate(['/company/dashboard']);
                        }
                    });
                } else {
                    this.saving.set(false);
                    this.notificationService.success('Job saved as draft successfully!');
                    this.router.navigate(['/company/dashboard']);
                }
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(err.error?.message || 'Failed to create job. Please try again.');
                this.notificationService.error('Failed to create job. Please try again.');
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
}
