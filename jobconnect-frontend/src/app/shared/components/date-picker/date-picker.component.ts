import { Component, Input, forwardRef, signal, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-date-picker',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './date-picker.component.html',
    styleUrls: ['./date-picker.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DatePickerComponent),
            multi: true
        }
    ]
})
export class DatePickerComponent implements ControlValueAccessor {
    @Input() placeholder = 'Select date';
    @Input() disabled = false;
    @Input() minDate: Date | null = null;
    @Input() maxDate: Date | null = null;

    isOpen = signal(false);
    currentMonth = signal(new Date());
    selectedDate = signal<Date | null>(null);

    private onChange: (value: string | null) => void = () => { };
    private onTouched: () => void = () => { };

    constructor(private elementRef: ElementRef) { }

    // Days of the week
    weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Month names
    monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Computed values for calendar display
    currentMonthName = computed(() => {
        const date = this.currentMonth();
        return this.monthNames[date.getMonth()];
    });

    currentYear = computed(() => this.currentMonth().getFullYear());

    // Get calendar days for current month view
    calendarDays = computed(() => {
        const month = this.currentMonth();
        const year = month.getFullYear();
        const monthIndex = month.getMonth();

        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);

        const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; isDisabled: boolean }[] = [];

        // Add previous month's days
        const startDayOfWeek = firstDay.getDay();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, monthIndex, -i);
            days.push(this.createDayObj(date, false));
        }

        // Add current month's days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, monthIndex, i);
            days.push(this.createDayObj(date, true));
        }

        // Add next month's days to complete the grid (6 rows x 7 days = 42)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, monthIndex + 1, i);
            days.push(this.createDayObj(date, false));
        }

        return days;
    });

    private createDayObj(date: Date, isCurrentMonth: boolean) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateNormalized = new Date(date);
        dateNormalized.setHours(0, 0, 0, 0);

        const selected = this.selectedDate();
        let isSelected = false;
        if (selected) {
            const selectedNormalized = new Date(selected);
            selectedNormalized.setHours(0, 0, 0, 0);
            isSelected = dateNormalized.getTime() === selectedNormalized.getTime();
        }

        let isDisabled = false;
        if (this.minDate) {
            const min = new Date(this.minDate);
            min.setHours(0, 0, 0, 0);
            if (dateNormalized < min) isDisabled = true;
        }
        if (this.maxDate) {
            const max = new Date(this.maxDate);
            max.setHours(0, 0, 0, 0);
            if (dateNormalized > max) isDisabled = true;
        }

        return {
            date,
            isCurrentMonth,
            isToday: dateNormalized.getTime() === today.getTime(),
            isSelected,
            isDisabled
        };
    }

    // Display value
    displayValue = computed(() => {
        const date = this.selectedDate();
        if (!date) return '';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    });

    // Navigation
    prevMonth() {
        const current = this.currentMonth();
        this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    }

    nextMonth() {
        const current = this.currentMonth();
        this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    }

    // Select a date
    selectDate(day: { date: Date; isDisabled: boolean }) {
        if (day.isDisabled || this.disabled) return;

        this.selectedDate.set(day.date);
        this.currentMonth.set(new Date(day.date.getFullYear(), day.date.getMonth(), 1));

        // Format as YYYY-MM-DD for form value
        const formatted = this.formatDateForForm(day.date);
        this.onChange(formatted);
        this.onTouched();
        this.isOpen.set(false);
    }

    private formatDateForForm(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Toggle dropdown
    toggle() {
        if (this.disabled) return;
        this.isOpen.update(v => !v);
        if (this.isOpen()) {
            // Set current month to selected date or today
            const date = this.selectedDate() || new Date();
            this.currentMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
        }
    }

    // Clear selection
    clear(event: Event) {
        event.stopPropagation();
        this.selectedDate.set(null);
        this.onChange(null);
        this.onTouched();
    }

    // Close on outside click
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
        }
    }

    // ControlValueAccessor implementation
    writeValue(value: string | null): void {
        if (value) {
            this.selectedDate.set(new Date(value));
        } else {
            this.selectedDate.set(null);
        }
    }

    registerOnChange(fn: (value: string | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
