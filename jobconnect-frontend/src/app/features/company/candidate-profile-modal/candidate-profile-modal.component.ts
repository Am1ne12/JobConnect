import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandidateProfile } from '../../../core/models';

@Component({
    selector: 'app-candidate-profile-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="modal-overlay" (click)="close.emit()">
            <div class="modal-content" (click)="$event.stopPropagation()">
                <!-- Close Button -->
                <button class="close-btn" (click)="close.emit()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>

                @if (profile) {
                    <!-- CV Preview Panel - Matches CV Builder Style -->
                    <div class="cv-preview">
                        <!-- Personal Info Header -->
                        <div class="preview-personal">
                            <div class="personal-left">
                                <h1 class="preview-name">
                                    {{ profile.firstName }} {{ profile.lastName }}
                                </h1>
                                <div class="contact-row">
                                    @if (profile.location) {
                                        <span class="contact-item">📍 {{ profile.location }}</span>
                                    }
                                    @if (profile.phone) {
                                        <span class="contact-item">📞 {{ profile.phone }}</span>
                                    }
                                </div>
                            </div>
                            @if (matchingScore !== undefined) {
                                <div class="matching-badge" [class]="getScoreClass()">
                                    <span class="score">{{ matchingScore }}%</span>
                                    <span class="label">Match</span>
                                </div>
                            }
                        </div>

                        <!-- About Section -->
                        @if (profile.summary) {
                            <div class="preview-section-block">
                                <h3>About</h3>
                                <p>{{ profile.summary }}</p>
                            </div>
                        }

                        <!-- Skills Section -->
                        @if (profile.skills && profile.skills.length > 0) {
                            <div class="preview-section-block">
                                <h3>Skills</h3>
                                <div class="preview-skills">
                                    @for (skill of profile.skills; track skill.skillId) {
                                        <span class="preview-skill-tag">
                                            {{ skill.skillName }}
                                            @if (skill.yearsOfExperience) {
                                                <span class="years">{{ skill.yearsOfExperience }}y</span>
                                            }
                                        </span>
                                    }
                                </div>
                            </div>
                        }

                        <!-- Experience Section -->
                        @if (profile.experience && profile.experience.length > 0) {
                            <div class="preview-section-block">
                                <h3>Experience</h3>
                                @for (exp of profile.experience; track $index) {
                                    <div class="preview-item">
                                        <div class="preview-item-header">
                                            <strong>{{ exp.title }}</strong>
                                            <span class="preview-dates">
                                                {{ exp.startDate | date:'MMM yyyy' }} - 
                                                @if (exp.isCurrentRole) { Present } @else { {{ exp.endDate | date:'MMM yyyy' }} }
                                            </span>
                                        </div>
                                        <span class="preview-company">{{ exp.company }}</span>
                                        @if (exp.description) {
                                            <p class="preview-description">{{ exp.description }}</p>
                                        }
                                    </div>
                                }
                            </div>
                        }

                        <!-- Education Section -->
                        @if (profile.education && profile.education.length > 0) {
                            <div class="preview-section-block">
                                <h3>Education</h3>
                                @for (edu of profile.education; track $index) {
                                    <div class="preview-item">
                                        <div class="preview-item-header">
                                            <strong>{{ edu.degree }} in {{ edu.field }}</strong>
                                            <span class="preview-dates">{{ edu.graduationYear }}</span>
                                        </div>
                                        <span class="preview-company">{{ edu.institution }}</span>
                                        @if (edu.description) {
                                            <p class="preview-description">{{ edu.description }}</p>
                                        }
                                    </div>
                                }
                            </div>
                        }

                        <!-- Certifications Section -->
                        @if (profile.certifications && profile.certifications.length > 0) {
                            <div class="preview-section-block">
                                <h3>Certifications</h3>
                                @for (cert of profile.certifications; track $index) {
                                    <div class="preview-item">
                                        <div class="preview-item-header">
                                            <strong>{{ cert.name }}</strong>
                                            <span class="preview-dates">
                                                {{ cert.issueDate | date:'MMM yyyy' }}
                                                @if (cert.expiryDate) { - {{ cert.expiryDate | date:'MMM yyyy' }} }
                                            </span>
                                        </div>
                                        <span class="preview-company">{{ cert.issuer }}</span>
                                    </div>
                                }
                            </div>
                        }

                        <!-- Empty State -->
                        @if (!profile.summary && (!profile.skills || profile.skills.length === 0) && 
                             (!profile.experience || profile.experience.length === 0) && 
                             (!profile.education || profile.education.length === 0)) {
                            <div class="empty-state">
                                <div class="empty-icon">📄</div>
                                <h4>Profile not yet completed</h4>
                                <p>This candidate hasn't filled out their CV details yet.</p>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>
    `,
    styles: [`
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Overlay */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 2rem;
            animation: fadeIn 0.25s ease;
        }

        /* Modal Container */
        .modal-content {
            position: relative;
            width: 100%;
            max-width: 600px;
            max-height: 85vh;
            animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Close Button */
        .close-btn {
            position: absolute;
            top: -12px;
            right: -12px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: 50%;
            color: var(--text-secondary);
            cursor: pointer;
            z-index: 10;
            transition: all var(--transition-base);
            box-shadow: var(--shadow-lg);

            &:hover {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-color: transparent;
                color: white;
                transform: rotate(90deg) scale(1.1);
            }
        }

        /* CV Preview - Matches cv-builder.component.scss */
        .cv-preview {
            background: white;
            border-radius: var(--radius-xl);
            padding: 2rem;
            color: var(--text-primary);
            box-shadow: var(--shadow-xl);
            max-height: 85vh;
            overflow-y: auto;
            border: 1px solid var(--border-light);

            &::-webkit-scrollbar {
                width: 6px;
            }

            &::-webkit-scrollbar-track {
                background: transparent;
            }

            &::-webkit-scrollbar-thumb {
                background: var(--border-default);
                border-radius: 3px;
            }
        }

        /* Personal Info Header */
        .preview-personal {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid var(--bg-tertiary);
            margin-bottom: 1.5rem;
        }

        .personal-left {
            flex: 1;
            min-width: 0;
        }

        .preview-name {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 0.375rem 0;
            letter-spacing: -0.02em;
        }

        .contact-row {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .contact-item {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* Match Score Badge */
        .matching-badge {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0.75rem 1.25rem;
            border-radius: var(--radius-lg);
            flex-shrink: 0;

            &.score-high {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(52, 211, 153, 0.08));
                border: 1px solid rgba(16, 185, 129, 0.25);
            }

            &.score-medium {
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.08));
                border: 1px solid rgba(245, 158, 11, 0.25);
            }

            &.score-low {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(248, 113, 113, 0.08));
                border: 1px solid rgba(239, 68, 68, 0.25);
            }

            .score {
                font-size: 1.375rem;
                font-weight: 700;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .label {
                font-size: 0.6875rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--text-muted);
                font-weight: 600;
            }
        }

        /* Section Blocks */
        .preview-section-block {
            margin-bottom: 1.5rem;

            &:last-child {
                margin-bottom: 0;
            }

            h3 {
                font-size: 0.875rem;
                font-weight: 700;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 0 0 0.75rem 0;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid var(--accent-soft);
            }

            > p {
                color: var(--text-secondary);
                line-height: 1.7;
                font-size: 0.875rem;
                margin: 0;
            }
        }

        /* Skills */
        .preview-skills {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .preview-skill-tag {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            padding: 0.375rem 0.875rem;
            border-radius: var(--radius-full);
            font-size: 0.8125rem;
            font-weight: 500;

            .years {
                font-size: 0.6875rem;
                background: rgba(255, 255, 255, 0.25);
                padding: 0.125rem 0.375rem;
                border-radius: var(--radius-full);
            }
        }

        /* Preview Items (Experience, Education, Certifications) */
        .preview-item {
            background: var(--bg-glass);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-lg);
            padding: 1rem;
            margin-bottom: 0.75rem;
            transition: all var(--transition-fast);

            &:last-child {
                margin-bottom: 0;
            }

            &:hover {
                border-color: var(--border-default);
                box-shadow: var(--shadow-md);
                transform: translateX(4px);
            }
        }

        .preview-item-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 0.75rem;
            margin-bottom: 0.25rem;
            flex-wrap: wrap;

            strong {
                font-size: 0.9375rem;
                font-weight: 600;
                color: var(--text-primary);
            }
        }

        .preview-dates {
            font-size: 0.6875rem;
            color: white;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            padding: 0.25rem 0.625rem;
            border-radius: var(--radius-full);
            font-weight: 500;
            white-space: nowrap;
        }

        .preview-company {
            display: block;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .preview-description {
            font-size: 0.8125rem;
            line-height: 1.6;
            color: var(--text-muted);
            margin: 0.5rem 0 0 0;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 3rem 2rem;
            color: var(--text-muted);

            .empty-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                opacity: 0.6;
            }

            h4 {
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-secondary);
                margin: 0 0 0.5rem 0;
            }

            p {
                font-size: 0.875rem;
                margin: 0;
            }
        }

        /* Responsive */
        @media (max-width: 640px) {
            .modal-overlay {
                padding: 1rem;
            }

            .modal-content {
                max-height: 90vh;
            }

            .cv-preview {
                padding: 1.5rem;
                border-radius: var(--radius-lg);
            }

            .close-btn {
                top: -8px;
                right: -8px;
                width: 36px;
                height: 36px;
            }

            .preview-name {
                font-size: 1.375rem;
            }

            .preview-item-header {
                flex-direction: column;
                gap: 0.375rem;
            }
        }
    `]
})
export class CandidateProfileModalComponent {
    @Input() profile!: CandidateProfile;
    @Input() matchingScore?: number;
    @Output() close = new EventEmitter<void>();

    getScoreClass(): string {
        if (this.matchingScore === undefined) return '';
        if (this.matchingScore >= 70) return 'score-high';
        if (this.matchingScore >= 40) return 'score-medium';
        return 'score-low';
    }
}
