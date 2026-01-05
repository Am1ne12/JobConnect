import { Component, Input, Output, EventEmitter, HostListener, ElementRef, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
}

@Component({
    selector: 'app-custom-dropdown',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="custom-dropdown" [class.open]="isOpen" [class.disabled]="disabled">
      <button type="button" class="dropdown-trigger" (click)="toggle($event)" [disabled]="disabled">
        @if (getSelectedOption()?.icon) {
          <span class="dropdown-icon">{{ getSelectedOption()?.icon }}</span>
        }
        <span class="dropdown-label">{{ getSelectedOption()?.label || placeholder }}</span>
        <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div class="dropdown-menu">
        @for (option of options; track option.value) {
          <button 
            type="button"
            class="dropdown-option" 
            [class.selected]="value === option.value"
            (click)="selectOption(option.value)">
            @if (option.icon) {
              <span class="option-icon">{{ option.icon }}</span>
            }
            <span class="option-label">{{ option.label }}</span>
            @if (value === option.value) {
              <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            }
          </button>
        }
      </div>
    </div>
  `,
    styleUrl: './custom-dropdown.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CustomDropdownComponent),
            multi: true
        }
    ]
})
export class CustomDropdownComponent implements ControlValueAccessor {
    @Input() options: DropdownOption[] = [];
    @Input() placeholder = 'Select an option';
    @Input() disabled = false;

    @Output() selectionChange = new EventEmitter<string>();

    isOpen = false;
    value: string = '';

    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    constructor(private elementRef: ElementRef) { }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen = false;
        }
    }

    toggle(event: Event) {
        event.stopPropagation();
        if (!this.disabled) {
            this.isOpen = !this.isOpen;
        }
    }

    selectOption(optionValue: string) {
        this.value = optionValue;
        this.isOpen = false;
        this.onChange(optionValue);
        this.onTouched();
        this.selectionChange.emit(optionValue);
    }

    getSelectedOption(): DropdownOption | undefined {
        return this.options.find(o => o.value === this.value);
    }

    // ControlValueAccessor implementation
    writeValue(value: string): void {
        this.value = value || '';
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
