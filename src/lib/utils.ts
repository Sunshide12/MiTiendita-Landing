import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names safely with Tailwind CSS conflict resolution.
 * Usage: cn('px-4 py-2', condition && 'bg-blue-500', 'bg-red-500')
 * → 'px-4 py-2 bg-red-500' (last wins for conflicting utilities)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
