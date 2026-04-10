import { isWeekend, eachDayOfInterval } from "date-fns";

/**
 * Checks if a date is a business day (Monday - Friday).
 */
export const isBusinessDay = (date: Date): boolean => {
  return !isWeekend(date);
};

/**
 * Returns an array of dates within the interval that are business days.
 */
export const getBusinessDaysInInterval = (start: Date, end: Date): Date[] => {
  try {
    const allDays = eachDayOfInterval({ start, end });
    return allDays.filter(isBusinessDay);
  } catch (error) {
    console.error("Invalid interval for getBusinessDaysInInterval", { start, end });
    return [];
  }
};

/**
 * Global constant for annual leave limit
 */
export const ANNUAL_LEAVE_LIMIT = 21;
