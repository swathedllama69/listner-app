import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// Add this helper function somewhere in HomeOverview.tsx (or lib/utils.ts)
const getPreviousMonthRange = () => {
  const now = new Date();
  // Start of current month
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Start of previous month
  const startOfPreviousMonth = new Date(startOfCurrentMonth);
  startOfPreviousMonth.setMonth(startOfCurrentMonth.getMonth() - 1);

  // End of previous month (which is the start of the current month)
  const endOfPreviousMonth = startOfCurrentMonth;

  return {
    start: startOfPreviousMonth.toISOString(),
    end: endOfPreviousMonth.toISOString()
  };
};