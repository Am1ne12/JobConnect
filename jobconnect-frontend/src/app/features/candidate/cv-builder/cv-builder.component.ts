import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CandidateService } from '../../../core/services/candidate.service';
import { SkillService } from '../../../core/services/skill.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CandidateProfile, Skill, Experience, Education, Certification } from '../../../core/models';
import { Subscription, debounceTime, filter } from 'rxjs';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
    selector: 'app-cv-builder',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DatePickerComponent],
    templateUrl: './cv-builder.component.html',
    styleUrl: './cv-builder.component.scss'
})
export class CvBuilderComponent implements OnInit, OnDestroy {
    cvForm!: FormGroup;
    skills = signal<Skill[]>([]);
    selectedSkills = signal<number[]>([]);
    loading = signal(true);
    saving = signal(false);

    profile = signal<CandidateProfile | null>(null);

    // Signal to trigger preview updates
    formVersion = signal(0);
    private formSubscription?: Subscription;
    private autosaveSubscription?: Subscription;
    private isInitialLoad = true;

    // Computed for real-time preview - depends on formVersion signal
    previewData = computed(() => {
        // Trigger recomputation when formVersion changes
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
        private candidateService: CandidateService,
        private skillService: SkillService,
        private notificationService: NotificationService
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.loadData();

        // Subscribe to form changes for real-time preview
        this.formSubscription = this.cvForm.valueChanges.subscribe(() => {
            this.formVersion.update(v => v + 1);
        });

        // Autosave with debounce (1.5 second delay)
        this.autosaveSubscription = this.cvForm.valueChanges.pipe(
            debounceTime(1500),
            filter(() => !this.isInitialLoad && this.cvForm.valid)
        ).subscribe(() => {
            this.autoSave();
        });
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

        this.candidateService.getProfile().subscribe({
            next: (profile) => {
                this.profile.set(profile);
                this.populateForm(profile);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    private populateForm(profile: CandidateProfile) {
        this.cvForm.patchValue({
            personalInfo: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone || '',
                summary: profile.summary || '',
                location: profile.location || ''
            }
        });

        // Populate experience
        if (profile.experience) {
            profile.experience.forEach(exp => this.addExperience(exp));
        }

        // Populate education
        if (profile.education) {
            profile.education.forEach(edu => this.addEducation(edu));
        }

        // Populate certifications
        if (profile.certifications) {
            profile.certifications.forEach(cert => this.addCertification(cert));
        }

        // Set selected skills
        if (profile.skills) {
            this.selectedSkills.set(profile.skills.map(s => s.skillId));
        }

        // Trigger initial preview update
        this.formVersion.update(v => v + 1);

        // Mark initial load as complete after a small delay
        setTimeout(() => {
            this.isInitialLoad = false;
        }, 100);
    }

    // Experience FormArray
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

    // Education FormArray
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

    // Certifications FormArray
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

    // Skills toggle
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

    // Autosave profile (called automatically on form changes)
    private autoSave() {
        if (this.cvForm.invalid || this.saving()) return;

        this.saving.set(true);
        const formValue = this.cvForm.value;
        const startTime = Date.now();
        const minDisplayTime = 800; // Minimum time to show "Saving..." state

        // Transform experience data
        const experience = formValue.experience.map((exp: any) => ({
            company: exp.company,
            title: exp.title,
            startDate: exp.startDate ? new Date(exp.startDate).toISOString() : null,
            endDate: exp.endDate && !exp.isCurrentRole ? new Date(exp.endDate).toISOString() : null,
            isCurrentRole: exp.isCurrentRole || false,
            description: exp.description || ''
        }));

        // Transform education data
        const education = formValue.education.map((edu: any) => ({
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            graduationYear: parseInt(edu.graduationYear) || new Date().getFullYear(),
            description: edu.description || ''
        }));

        // Transform certifications data
        const certifications = formValue.certifications.map((cert: any) => ({
            name: cert.name,
            issuer: cert.issuer,
            issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString() : null,
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString() : null
        }));

        const updateData = {
            firstName: formValue.personalInfo.firstName,
            lastName: formValue.personalInfo.lastName,
            phone: formValue.personalInfo.phone || null,
            summary: formValue.personalInfo.summary || null,
            location: formValue.personalInfo.location || null,
            experience: experience.length > 0 ? experience : null,
            education: education.length > 0 ? education : null,
            certifications: certifications.length > 0 ? certifications : null,
            skillIds: this.selectedSkills().length > 0 ? this.selectedSkills() : null
        };

        this.candidateService.updateProfile(updateData).subscribe({
            next: () => {
                // Ensure minimum display time for smooth UX
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, minDisplayTime - elapsed);
                setTimeout(() => {
                    this.saving.set(false);
                }, remaining);
            },
            error: (err) => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, minDisplayTime - elapsed);
                setTimeout(() => {
                    this.saving.set(false);
                    console.error('Autosave error:', err);
                    this.notificationService.error('Failed to autosave. Please check your connection.');
                }, remaining);
            }
        });
    }

    private formatDate(date: Date | string): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }
}
