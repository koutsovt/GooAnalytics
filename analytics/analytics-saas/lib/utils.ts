import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts (later classes win).
 * Standard shadcn/ui helper so components from 21st.dev drop in unchanged.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
