import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CandidateService } from '../../../core/services/candidate.service';
import { SkillService } from '../../../core/services/skill.service';
import { CandidateProfile, Skill, Experience, Education, Certification } from '../../../core/models';

@Component({
    selector: 'app-cv-builder',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './cv-builder.component.html',
    styleUrl: './cv-builder.component.scss'
})
export class CvBuilderComponent implements OnInit {
    cvForm!: FormGroup;
    skills = signal<Skill[]>([]);
    selectedSkills = signal<number[]>([]);
    loading = signal(false);
    saving = signal(false);

    profile = signal<CandidateProfile | null>(null);

    // Computed for real-time preview
    previewData = computed(() => {
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
        private skillService: SkillService
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.loadData();
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
    }

    removeExperience(index: number) {
        this.experienceArray.removeAt(index);
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
    }

    removeEducation(index: number) {
        this.educationArray.removeAt(index);
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
    }

    removeCertification(index: number) {
        this.certificationsArray.removeAt(index);
    }

    // Skills toggle
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

    // Save profile
    save() {
        if (this.cvForm.invalid) return;

        this.saving.set(true);
        const formValue = this.cvForm.value;

        const updateData = {
            firstName: formValue.personalInfo.firstName,
            lastName: formValue.personalInfo.lastName,
            phone: formValue.personalInfo.phone,
            summary: formValue.personalInfo.summary,
            location: formValue.personalInfo.location,
            experience: formValue.experience,
            education: formValue.education,
            certifications: formValue.certifications,
            skillIds: this.selectedSkills()
        };

        this.candidateService.updateProfile(updateData).subscribe({
            next: () => {
                this.saving.set(false);
                // Show success message
            },
            error: () => this.saving.set(false)
        });
    }

    private formatDate(date: Date | string): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }
}
