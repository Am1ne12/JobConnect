import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-confirm-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        @if (isOpen()) {
            <div class="modal-overlay" (click)="onOverlayClick($event)">
                <div class="modal-container" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                        <h3 class="modal-title">{{ title }}</h3>
                        <button class="modal-close" (click)="close()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <p class="modal-message">{{ message }}</p>
                        
                        @if (showInput) {
                            <div class="input-group">
                                <label for="modal-input">{{ inputLabel }}</label>
                                <textarea 
                                    id="modal-input"
                                    [(ngModel)]="inputValue"
                                    [placeholder]="inputPlaceholder"
                                    rows="3"
                                ></textarea>
                            </div>
                        }
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-cancel" (click)="close()">
                            Annuler
                        </button>
                        <button 
                            class="btn-confirm" 
                            [class.danger]="danger"
                            (click)="confirm()"
                            [disabled]="showInput && !inputValue.trim()"
                        >
                            {{ confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from { 
                opacity: 0;
                transform: scale(0.95) translateY(-10px);
            }
            to { 
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .modal-container {
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideIn 0.2s ease-out;
        }

        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
        }

        .modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }

        .modal-close {
            width: 32px;
            height: 32px;
            border: none;
            background: none;
            cursor: pointer;
            color: #6b7280;
            padding: 4px;
            border-radius: 8px;
            transition: all 0.2s;
        }

        .modal-close:hover {
            background: #f3f4f6;
            color: #111827;
        }

        .modal-close svg {
            width: 100%;
            height: 100%;
        }

        .modal-body {
            padding: 24px;
        }

        .modal-message {
            margin: 0 0 16px;
            color: #4b5563;
            font-size: 15px;
            line-height: 1.6;
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .input-group label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
        }

        .input-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            resize: vertical;
            transition: all 0.2s;
            background: #f9fafb;
        }

        .input-group textarea:focus {
            outline: none;
            border-color: #6366f1;
            background: white;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .input-group textarea::placeholder {
            color: #9ca3af;
        }

        .modal-actions {
            display: flex;
            gap: 12px;
            padding: 16px 24px 24px;
            justify-content: flex-end;
        }

        .modal-actions button {
            padding: 10px 20px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-cancel {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            color: #374151;
        }

        .btn-cancel:hover {
            background: #e5e7eb;
        }

        .btn-confirm {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            color: white;
        }

        .btn-confirm:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .btn-confirm.danger {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .btn-confirm.danger:hover:not(:disabled) {
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .btn-confirm:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `]
})
export class ConfirmModalComponent {
    @Input() title = 'Confirmation';
    @Input() message = 'Êtes-vous sûr ?';
    @Input() confirmText = 'Confirmer';
    @Input() showInput = false;
    @Input() inputLabel = 'Motif';
    @Input() inputPlaceholder = 'Entrez votre réponse...';
    @Input() danger = false;

    @Output() confirmed = new EventEmitter<string>();
    @Output() cancelled = new EventEmitter<void>();

    isOpen = signal(false);
    inputValue = '';

    open() {
        this.inputValue = '';
        this.isOpen.set(true);
    }

    close() {
        this.isOpen.set(false);
        this.cancelled.emit();
    }

    confirm() {
        this.isOpen.set(false);
        this.confirmed.emit(this.inputValue);
    }

    onOverlayClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            this.close();
        }
    }
}
