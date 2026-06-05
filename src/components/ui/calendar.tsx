"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

// ── Types ────────────────────────────────────────────────────────

interface CalendarProps {
  /** Currently selected date */
  selected?: Date
  /** Called when a date is selected */
  onSelect?: (date: Date | undefined) => void
  /** Minimum selectable date */
  fromDate?: Date
  /** Maximum selectable date */
  toDate?: Date
  /** Whether to show days from the previous/next month */
  showOutsideDays?: boolean
  /** Additional class name */
  className?: string
  /** Initial month to display */
  defaultMonth?: Date
  /** Controlled month */
  month?: Date
  /** Called when the displayed month changes */
  onMonthChange?: (month: Date) => void
  /** Number of months to display */
  numberOfMonths?: number
  /** Disabled dates */
  disabled?: (date: Date) => boolean
  /** Modifier class names (compatibility) */
  classNames?: Record<string, string>
  /** Button variant for nav */
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  /** Additional props */
  [key: string]: unknown
}

// ── Helpers ──────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isDateBefore(date: Date, reference: Date): boolean {
  return date < new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
}

function isDateAfter(date: Date, reference: Date): boolean {
  const refEnd = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999)
  return date > refEnd
}

// ── Calendar Component ───────────────────────────────────────────

function Calendar({
  selected,
  onSelect,
  fromDate,
  toDate,
  showOutsideDays = true,
  className,
  defaultMonth,
  month: controlledMonth,
  onMonthChange,
  numberOfMonths = 1,
  disabled,
  classNames,
  buttonVariant = "ghost",
  ...props
}: CalendarProps) {
  const today = new Date()
  const [internalMonth, setInternalMonth] = React.useState<Date>(
    defaultMonth ?? controlledMonth ?? selected ?? today
  )

  const displayedMonth = controlledMonth ?? internalMonth

  const setMonth = React.useCallback(
    (newMonth: Date) => {
      if (!controlledMonth) {
        setInternalMonth(newMonth)
      }
      onMonthChange?.(newMonth)
    },
    [controlledMonth, onMonthChange]
  )

  const goToPrevMonth = React.useCallback(() => {
    const prev = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1)
    setMonth(prev)
  }, [displayedMonth, setMonth])

  const goToNextMonth = React.useCallback(() => {
    const next = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1)
    setMonth(next)
  }, [displayedMonth, setMonth])

  const handleDayClick = React.useCallback(
    (date: Date) => {
      onSelect?.(date)
    },
    [onSelect]
  )

  const formatCaption = (date: Date): string => {
    return date.toLocaleString("default", { month: "long", year: "numeric" })
  }

  // Render a single month grid
  const renderMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)

    // Previous month days for outside days
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

    const cells: React.ReactNode[] = []

    // Fill in outside days from previous month
    for (let i = 0; i < firstDay; i++) {
      const day = daysInPrevMonth - firstDay + i + 1
      if (showOutsideDays) {
        const outsideDate = new Date(prevYear, prevMonth, day)
        const isDisabled = disabled?.(outsideDate) ?? false
        cells.push(
          <td
            key={`prev-${i}`}
            className="relative w-full h-full p-0 text-center select-none"
          >
            <button
              type="button"
              disabled
              className="flex aspect-square size-auto w-full min-w-[--cell-size] items-center justify-center rounded-md text-muted-foreground opacity-50 font-normal text-sm leading-none"
            >
              {day}
            </button>
          </td>
        )
      } else {
        cells.push(
          <td key={`empty-${i}`} className="relative w-full h-full p-0 select-none">
            <div className="flex aspect-square size-auto w-full min-w-[--cell-size] items-center justify-center" />
          </td>
        )
      }
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isSelected = selected ? isSameDay(date, selected) : false
      const isToday = isSameDay(date, today)
      const isDisabled =
        disabled?.(date) ??
        (fromDate ? isDateBefore(date, fromDate) : false) ||
        (toDate ? isDateAfter(date, toDate) : false)

      cells.push(
        <td
          key={day}
          className="relative w-full h-full p-0 text-center select-none group/day aspect-square"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isDisabled}
            data-day={date.toLocaleDateString()}
            data-selected-single={isSelected || undefined}
            onClick={() => !isDisabled && handleDayClick(date)}
            className={cn(
              "flex aspect-square size-auto w-full min-w-[--cell-size] items-center justify-center font-normal text-sm leading-none",
              isToday && !isSelected && "bg-accent text-accent-foreground rounded-md",
              isSelected &&
                "bg-primary text-primary-foreground rounded-md hover:bg-primary hover:text-primary-foreground",
              isDisabled && "text-muted-foreground opacity-50"
            )}
          >
            {day}
          </Button>
        </td>
      )
    }

    // Fill outside days from next month to complete the grid
    const totalCells = firstDay + daysInMonth
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year

    for (let i = 1; i <= remaining; i++) {
      if (showOutsideDays) {
        const outsideDate = new Date(nextYear, nextMonth, i)
        cells.push(
          <td
            key={`next-${i}`}
            className="relative w-full h-full p-0 text-center select-none"
          >
            <button
              type="button"
              disabled
              className="flex aspect-square size-auto w-full min-w-[--cell-size] items-center justify-center rounded-md text-muted-foreground opacity-50 font-normal text-sm leading-none"
            >
              {i}
            </button>
          </td>
        )
      } else {
        cells.push(
          <td key={`next-empty-${i}`} className="relative w-full h-full p-0 select-none">
            <div className="flex aspect-square size-auto w-full min-w-[--cell-size] items-center justify-center" />
          </td>
        )
      }
    }

    // Chunk cells into weeks
    const weeks: React.ReactNode[] = []
    for (let i = 0; i < cells.length; i += 7) {
      const weekCells = cells.slice(i, i + 7)
      weeks.push(
        <tr key={`week-${i / 7}`} className="flex w-full mt-2">
          {weekCells}
        </tr>
      )
    }

    return weeks
  }

  // Render multiple months if needed
  const months: Date[] = []
  for (let i = 0; i < numberOfMonths; i++) {
    months.push(
      new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + i, 1)
    )
  }

  return (
    <div
      data-slot="calendar"
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        className
      )}
      {...props}
    >
      <div className={cn("flex gap-4 flex-col md:flex-row relative")}>
        {months.map((monthDate, idx) => (
          <div key={idx} className="flex flex-col w-full gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-1 w-full justify-between">
              {idx === 0 && (
                <Button
                  type="button"
                  variant={buttonVariant}
                  size="icon"
                  onClick={goToPrevMonth}
                  className="size-(--cell-size) p-0 select-none"
                  aria-label="Go to previous month"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
              )}
              {idx !== 0 && <div className="size-(--cell-size)" />}

              {/* Caption */}
              <div className="flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)">
                <span className="select-none font-medium text-sm">
                  {formatCaption(monthDate)}
                </span>
              </div>

              {idx === months.length - 1 && (
                <Button
                  type="button"
                  variant={buttonVariant}
                  size="icon"
                  onClick={goToNextMonth}
                  className="size-(--cell-size) p-0 select-none"
                  aria-label="Go to next month"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              )}
              {idx !== months.length - 1 && <div className="size-(--cell-size)" />}
            </div>

            {/* Day Grid */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="flex">
                  {DAYS_OF_WEEK.map((day) => (
                    <th
                      key={day}
                      className="text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none"
                      scope="col"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{renderMonth(monthDate)}</tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

export { Calendar }
