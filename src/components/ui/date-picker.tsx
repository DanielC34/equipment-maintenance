'use client';

import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover } from '@base-ui/react/popover';

import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function sameDate(first: Date | undefined, second: Date): boolean {
  return Boolean(first && formatDateValue(first) === formatDateValue(second));
}

interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

function DatePicker({
  id,
  name,
  value,
  defaultValue = '',
  onChange,
  className,
  disabled = false,
  placeholder = 'Select a date',
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectedValue = isControlled ? value : internalValue;
  const selectedDate = parseDateValue(selectedValue);
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() =>
    startOfMonth(selectedDate ?? new Date())
  );
  const [focusedDate, setFocusedDate] = React.useState<Date | undefined>(
    selectedDate
  );

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const firstDay = addDays(monthStart, -monthStart.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(firstDay, index));
  }, [visibleMonth]);

  function selectDate(date: Date) {
    const nextValue = formatDateValue(date);
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  }

  function moveFocus(date: Date) {
    setFocusedDate(date);
    setVisibleMonth(startOfMonth(date));
  }

  function handleDayKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: Date
  ) {
    let nextDate: Date | undefined;

    switch (event.key) {
      case 'ArrowLeft':
        nextDate = addDays(date, -1);
        break;
      case 'ArrowRight':
        nextDate = addDays(date, 1);
        break;
      case 'ArrowUp':
        nextDate = addDays(date, -7);
        break;
      case 'ArrowDown':
        nextDate = addDays(date, 7);
        break;
      case 'Home':
        nextDate = addDays(date, -date.getDay());
        break;
      case 'End':
        nextDate = addDays(date, 6 - date.getDay());
        break;
      case 'PageUp':
        nextDate = addMonths(date, -1);
        break;
      case 'PageDown':
        nextDate = addMonths(date, 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectDate(date);
        return;
      default:
        return;
    }

    event.preventDefault();
    moveFocus(nextDate);
    requestAnimationFrame(() => {
      document
        .getElementById(`${id ?? 'date-picker'}-${formatDateValue(nextDate!)}`)
        ?.focus();
    });
  }

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(selectedDate)
    : placeholder;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={selectedValue} />
      <Popover.Trigger
        id={id}
        disabled={disabled}
        aria-label={
          selectedDate ? `Selected date, ${displayValue}` : placeholder
        }
        className={cn(
          'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[7px] border border-input bg-transparent px-3 py-2 text-left text-sm transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-input/30 dark:[color-scheme:dark]',
          selectedDate ? 'text-foreground' : 'text-muted-foreground',
          className
        )}
      >
        <span className="truncate">{displayValue}</span>
        <CalendarDays
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} className="z-50 outline-none">
          <Popover.Popup
            role="dialog"
            aria-label="Choose date"
            className="w-[min(20rem,calc(100vw-2rem))] rounded-[7px] border border-border bg-popover p-3 text-popover-foreground outline-none"
          >
            <div className="flex items-center justify-between gap-2 pb-3">
              <button
                type="button"
                aria-label="Previous month"
                className="inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => {
                  const nextMonth = addMonths(visibleMonth, -1);
                  setVisibleMonth(nextMonth);
                  setFocusedDate(nextMonth);
                }}
              >
                <ChevronLeft aria-hidden className="size-4" />
              </button>
              <p className="text-sm font-medium">
                {new Intl.DateTimeFormat('en-US', {
                  month: 'long',
                  year: 'numeric',
                }).format(visibleMonth)}
              </p>
              <button
                type="button"
                aria-label="Next month"
                className="inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => {
                  const nextMonth = addMonths(visibleMonth, 1);
                  setVisibleMonth(nextMonth);
                  setFocusedDate(nextMonth);
                }}
              >
                <ChevronRight aria-hidden className="size-4" />
              </button>
            </div>
            <div
              className="grid grid-cols-7 gap-1"
              role="grid"
              aria-label="Calendar"
            >
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  role="columnheader"
                  className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {weekday.slice(0, 2)}
                </div>
              ))}
              {days.map((date) => {
                const dateValue = formatDateValue(date);
                const isCurrentMonth =
                  date.getMonth() === visibleMonth.getMonth();
                const isSelected = sameDate(selectedDate, date);
                const isToday = sameDate(new Date(), date);

                return (
                  <button
                    key={dateValue}
                    id={`${id ?? 'date-picker'}-${dateValue}`}
                    type="button"
                    role="gridcell"
                    aria-label={new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'full',
                    }).format(date)}
                    aria-selected={isSelected}
                    tabIndex={
                      sameDate(focusedDate, date) ||
                      (!focusedDate && isCurrentMonth)
                        ? 0
                        : -1
                    }
                    className={cn(
                      'inline-flex size-8 items-center justify-center rounded-[5px] text-sm outline-none transition-colors',
                      'hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                      isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/50',
                      isToday &&
                        'font-semibold underline decoration-[var(--io-accent)] underline-offset-2',
                      isSelected &&
                        'bg-[var(--io-accent)] text-white hover:bg-[var(--io-accent)]/90 hover:text-white'
                    )}
                    onClick={() => selectDate(date)}
                    onFocus={() => setFocusedDate(date)}
                    onKeyDown={(event) => handleDayKeyDown(event, date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { DatePicker };
