import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { SkillService } from '../../../core/services/skill.service';
import { Skill, JobType, JobPosting } from '../../../core/models';

@Component({
    selector: 'app-job-edit',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './job-edit.component.html',
    styleUrl: './job-edit.component.scss'
})
export class JobEditComponent implements OnInit {
    @Input() id!: string;

    jobForm!: FormGroup;
    job = signal<JobPosting | null>(null);
    skills = signal<Skill[]>([]);
    selectedSkills = signal<number[]>([]);
    loading = signal(true);
    saving = signal(false);
    error = signal<string | null>(null);
    shouldPublish = signal(false);

    readonly jobTypes = [
        { value: JobType.FullTime, label: 'Full Time' },
        { value: JobType.PartTime, label: 'Part Time' },
        { value: JobType.Contract, label: 'Contract' },
        { value: JobType.Internship, label: 'Internship' },
        { value: JobType.Remote, label: 'Remote' }
    ];

    readonly currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

    get jobId(): number {
        return parseInt(this.id);
    }

    constructor(
        private fb: FormBuilder,
        private jobService: JobService,
        private skillService: SkillService,
        private router: Router
    ) {
        this.initForm();
    }

    ngOnInit() {
        // Load skills
        this.skillService.getSkills().subscribe(skills => {
            this.skills.set(skills);
        });

        // Load job data
        this.jobService.getJob(this.jobId).subscribe({
            next: (job) => {
                this.job.set(job);
                this.populateForm(job);
                // Set publish based on current status
                this.shouldPublish.set(job.status === 'Published');
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
            type: [JobType.FullTime, Validators.required],
            salaryMin: [null],
            salaryMax: [null],
            salaryCurrency: ['EUR'],
            experienceYearsMin: [0],
            experienceYearsMax: [null]
        });
    }

    private populateForm(job: JobPosting) {
        // Map job type string to enum value
        const typeValue = this.getJobTypeValue(job.jobType);

        this.jobForm.patchValue({
            title: job.title,
            description: job.description,
            requirements: job.requirements || '',
            benefits: job.benefits || '',
            location: job.location || '',
            type: typeValue,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency || 'EUR',
            experienceYearsMin: job.experienceYearsMin || 0,
            experienceYearsMax: job.experienceYearsMax
        });

        // Set selected skills
        if (job.requiredSkills) {
            this.selectedSkills.set(job.requiredSkills.map(s => s.skillId));
        }
    }

    private getJobTypeValue(typeString: string): JobType {
        const typeMap: { [key: string]: JobType } = {
            'FullTime': JobType.FullTime,
            'PartTime': JobType.PartTime,
            'Contract': JobType.Contract,
            'Internship': JobType.Internship,
            'Remote': JobType.Remote
        };
        return typeMap[typeString] ?? JobType.FullTime;
    }

    setShouldPublish(value: boolean) {
        this.shouldPublish.set(value);
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
            requiredSkills: this.selectedSkills().map(skillId => ({
                skillId,
                isRequired: true
            }))
        };

        this.jobService.updateJob(this.jobId, jobData).subscribe({
            next: () => {
                if (this.shouldPublish() && this.job()?.status !== 'Published') {
                    // Publish the job after update
                    this.jobService.publishJob(this.jobId).subscribe({
                        next: () => {
                            this.saving.set(false);
                            this.router.navigate(['/company/jobs', this.jobId, 'candidates']);
                        },
                        error: () => {
                            this.saving.set(false);
                            this.router.navigate(['/company/jobs', this.jobId, 'candidates']);
                        }
                    });
                } else {
                    this.saving.set(false);
                    this.router.navigate(['/company/jobs', this.jobId, 'candidates']);
                }
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(err.error?.message || 'Failed to update job. Please try again.');
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
