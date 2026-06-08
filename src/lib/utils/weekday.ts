import { addDays, getDay } from "date-fns";

// 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
export function isWeekday(date: Date): boolean {
  const day = getDay(date);
  return day >= 1 && day <= 5;
}

export function isWeekend(date: Date): boolean {
  return !isWeekday(date);
}

export function getNextWeekday(date: Date): Date {
  const day = getDay(date);
  // Friday (5) → Monday (+3), Saturday (6) → Monday (+2), Sunday (0) → Monday (+1), else +1
  const daysToAdd = day === 5 ? 3 : day === 6 ? 2 : day === 0 ? 1 : 1;
  return addDays(date, daysToAdd);
}

export function getMondayOfWeek(date: Date): Date {
  const day = getDay(date);
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}
