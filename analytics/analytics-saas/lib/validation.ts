import { z } from "zod";

// HH:MM, 24-hour. Matches the scheduleTime column (varchar length 5).
const scheduleTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "scheduleTime must be HH:MM");

// Shared schedule fields. Bounds mirror the DB columns and cron expectations:
// day-of-month 1-31, day-of-week 0-6 (0 = Sunday, matching the cron weekday map).
const scheduleShape = {
  scheduleFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  scheduleDayOfMonth: z.number().int().min(1).max(31).optional(),
  scheduleDayOfWeek: z.number().int().min(0).max(6).optional(),
  scheduleTime: scheduleTime.optional(),
  scheduleTimezone: z.string().min(1).max(100).optional(),
};

const contactShape = {
  ga4PropertyId: z.string().max(255).optional(),
  gbpLocationId: z.string().max(255).optional(),
  recipientPhone: z.string().max(20).optional(),
};

export const createConfigSchema = z.object({
  gscSiteUrl: z.string().url().max(255),
  recipientEmail: z.string().email().max(255),
  ...contactShape,
  ...scheduleShape,
});

export const updateConfigSchema = z.object({
  businessName: z.string().min(1).max(255).optional(),
  gscSiteUrl: z.string().url().max(255).optional(),
  recipientEmail: z.string().email().max(255).optional(),
  ...contactShape,
  ...scheduleShape,
});

export type CreateConfigInput = z.infer<typeof createConfigSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
