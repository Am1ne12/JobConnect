import { Component, OnInit, OnDestroy, Input, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SkillService } from '../../../core/services/skill.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfigService } from '../../../core/services/config.service';
import { Skill, Experience, Education, Certification } from '../../../core/models';
import { Subscription, debounceTime, filter } from 'rxjs';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

interface AdminCandidateProfile {
    id: number;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    summary?: string;
    location?: string;
    photoUrl?: string;
    skills?: { skillId: number; skillName: string; proficiencyLevel: number }[];
    experience?: Experience[];
    education?: Education[];
    certifications?: Certification[];
}

@Component({
    selector: 'app-admin-candidate-edit',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DatePickerComponent],
    templateUrl: './admin-candidate-edit.component.html',
    styleUrl: './admin-candidate-edit.component.scss'
})
export class AdminCandidateEditComponent implements OnInit, OnDestroy {
    @Input() id?: string;

    cvForm!: FormGroup;
    skills = signal<Skill[]>([]);
    selectedSkills = signal<number[]>([]);
    loading = signal(true);
    saving = signal(false);
    isNewCandidate = signal(false);

    profile = signal<AdminCandidateProfile | null>(null);
    formVersion = signal(0);
    private formSubscription?: Subscription;
    private autosaveSubscription?: Subscription;
    private isInitialLoad = true;

    previewData = computed(() => {
        this.formVersion();
        if (!this.cvForm) return null;
        return {
            personalInfo: this.cvForm.get('personalInfo')?.value,
            experience: this.experienceArray?.value || [],
            education: this.educationArray?.value || [],
            certifications: this.certificationsArray?.value || [],
            skills: this.skills().filter(s => this.selectedSkills().includes(s.id))
        };
    });

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private skillService: SkillService,
        private notificationService: NotificationService,
        private configService: ConfigService,
        private router: Router,
        private location: Location
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.isNewCandidate.set(!this.id);
        this.loadData();

        this.formSubscription = this.cvForm.valueChanges.subscribe(() => {
            this.formVersion.update(v => v + 1);
        });

        // Only autosave for existing candidates
        if (this.id) {
            this.autosaveSubscription = this.cvForm.valueChanges.pipe(
                debounceTime(1500),
                filter(() => !this.isInitialLoad && this.cvForm.valid)
            ).subscribe(() => {
                this.autoSave();
            });
        }
    }

    ngOnDestroy() {
        this.formSubscription?.unsubscribe();
        this.autosaveSubscription?.unsubscribe();
    }

    private initForm() {
        this.cvForm = this.fb.group({
            personalInfo: this.fb.group({
                firstName: ['', Validators.required],
                lastName: ['', Validators.required],
                email: ['', [Validators.required, Validators.email]],
                password: [''],
                phone: [''],
                summary: [''],
                location: ['']
            }),
            experience: this.fb.array([]),
            education: this.fb.array([]),
            certifications: this.fb.array([])
        });
    }

    private loadData() {
        this.loading.set(true);

        this.skillService.getSkills().subscribe(skills => {
            this.skills.set(skills);
        });

        if (this.id) {
            this.http.get<AdminCandidateProfile>(`${this.configService.apiUrl}/admin/candidates/${this.id}`).subscribe({
                next: (profile) => {
                    this.profile.set(profile);
                    this.populateForm(profile);
                    this.loading.set(false);
                },
                error: () => {
                    this.notificationService.error('Failed to load candidate');
                    this.loading.set(false);
                }
            });
        } else {
            // New candidate - require password
            this.cvForm.get('personalInfo.password')?.setValidators([Validators.required, Validators.minLength(6)]);
            this.cvForm.get('personalInfo.password')?.updateValueAndValidity();
            this.loading.set(false);
            this.isInitialLoad = false;
        }
    }

    private populateForm(profile: AdminCandidateProfile) {
        this.cvForm.patchValue({
            personalInfo: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                phone: profile.phone || '',
                summary: profile.summary || '',
                location: profile.location || ''
            }
        });

        if (profile.experience) {
            profile.experience.forEach(exp => this.addExperience(exp));
        }

        if (profile.education) {
            profile.education.forEach(edu => this.addEducation(edu));
        }

        if (profile.certifications) {
            profile.certifications.forEach(cert => this.addCertification(cert));
        }

        if (profile.skills) {
            this.selectedSkills.set(profile.skills.map(s => s.skillId));
        }

        this.formVersion.update(v => v + 1);

        setTimeout(() => {
            this.isInitialLoad = false;
        }, 100);
    }

    get experienceArray(): FormArray {
        return this.cvForm.get('experience') as FormArray;
    }

    addExperience(exp?: Experience) {
        const group = this.fb.group({
            company: [exp?.company || '', Validators.required],
            title: [exp?.title || '', Validators.required],
            startDate: [exp?.startDate ? this.formatDate(exp.startDate) : ''],
            endDate: [exp?.endDate ? this.formatDate(exp.endDate) : ''],
            isCurrentRole: [exp?.isCurrentRole || false],
            description: [exp?.description || '']
        });
        this.experienceArray.push(group);
        this.formVersion.update(v => v + 1);
    }

    removeExperience(index: number) {
        this.experienceArray.removeAt(index);
        this.formVersion.update(v => v + 1);
    }

    get educationArray(): FormArray {
        return this.cvForm.get('education') as FormArray;
    }

    addEducation(edu?: Education) {
        const group = this.fb.group({
            institution: [edu?.institution || '', Validators.required],
            degree: [edu?.degree || '', Validators.required],
            field: [edu?.field || '', Validators.required],
            graduationYear: [edu?.graduationYear || new Date().getFullYear()],
            description: [edu?.description || '']
        });
        this.educationArray.push(group);
        this.formVersion.update(v => v + 1);
    }

    removeEducation(index: number) {
        this.educationArray.removeAt(index);
        this.formVersion.update(v => v + 1);
    }

    get certificationsArray(): FormArray {
        return this.cvForm.get('certifications') as FormArray;
    }

    addCertification(cert?: Certification) {
        const group = this.fb.group({
            name: [cert?.name || '', Validators.required],
            issuer: [cert?.issuer || '', Validators.required],
            issueDate: [cert?.issueDate ? this.formatDate(cert.issueDate) : ''],
            expiryDate: [cert?.expiryDate ? this.formatDate(cert.expiryDate) : '']
        });
        this.certificationsArray.push(group);
        this.formVersion.update(v => v + 1);
    }

    removeCertification(index: number) {
        this.certificationsArray.removeAt(index);
        this.formVersion.update(v => v + 1);
    }

    toggleSkill(skillId: number) {
        const current = this.selectedSkills();
        if (current.includes(skillId)) {
            this.selectedSkills.set(current.filter(id => id !== skillId));
        } else {
            this.selectedSkills.set([...current, skillId]);
        }
        this.formVersion.update(v => v + 1);
    }

    isSkillSelected(skillId: number): boolean {
        return this.selectedSkills().includes(skillId);
    }

    private autoSave() {
        if (this.cvForm.invalid || this.saving() || !this.id) return;
        this.saveCandidate(false);
    }

    saveCandidate(showNotification = true) {
        if (this.cvForm.invalid) {
            this.cvForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        const formValue = this.cvForm.value;

        const experience = formValue.experience.map((exp: any) => ({
            company: exp.company,
            title: exp.title,
            startDate: exp.startDate ? new Date(exp.startDate).toISOString() : null,
            endDate: exp.endDate && !exp.isCurrentRole ? new Date(exp.endDate).toISOString() : null,
            isCurrentRole: exp.isCurrentRole || false,
            description: exp.description || ''
        }));

        const education = formValue.education.map((edu: any) => ({
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            graduationYear: parseInt(edu.graduationYear) || new Date().getFullYear(),
            description: edu.description || ''
        }));

        const certifications = formValue.certifications.map((cert: any) => ({
            name: cert.name,
            issuer: cert.issuer,
            issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString() : null,
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString() : null
        }));

        if (this.id) {
            // Update existing candidate
            const updateData = {
                firstName: formValue.personalInfo.firstName,
                lastName: formValue.personalInfo.lastName,
                email: formValue.personalInfo.email,
                phone: formValue.personalInfo.phone || null,
                summary: formValue.personalInfo.summary || null,
                location: formValue.personalInfo.location || null,
                experience: experience.length > 0 ? experience : null,
                education: education.length > 0 ? education : null,
                certifications: certifications.length > 0 ? certifications : null,
                skillIds: this.selectedSkills().length > 0 ? this.selectedSkills() : null
            };

            this.http.put(`${this.configService.apiUrl}/admin/candidates/${this.id}`, updateData).subscribe({
                next: () => {
                    this.saving.set(false);
                    if (showNotification) {
                        this.notificationService.success('Candidate updated successfully!');
                    }
                },
                error: (err) => {
                    this.saving.set(false);
                    this.notificationService.error(err.error?.message || 'Failed to update candidate');
                }
            });
        } else {
            // Create new candidate
            const createData = {
                firstName: formValue.personalInfo.firstName,
                lastName: formValue.personalInfo.lastName,
                email: formValue.personalInfo.email,
                password: formValue.personalInfo.password,
                phone: formValue.personalInfo.phone || null,
                summary: formValue.personalInfo.summary || null,
                location: formValue.personalInfo.location || null,
                skillIds: this.selectedSkills().length > 0 ? this.selectedSkills() : null
            };

            this.http.post<AdminCandidateProfile>(`${this.configService.apiUrl}/admin/candidates`, createData).subscribe({
                next: (newProfile) => {
                    this.saving.set(false);
                    this.notificationService.success('Candidate created successfully!');
                    this.router.navigate(['/admin/candidates', newProfile.id, 'edit']);
                },
                error: (err) => {
                    this.saving.set(false);
                    this.notificationService.error(err.error?.message || 'Failed to create candidate');
                }
            });
        }
    }

    goBack() {
        this.location.back();
    }

    private formatDate(date: Date | string): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }
}
