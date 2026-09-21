import { z } from 'zod';
import {
  ACTIVITIES,
  DAYTIME_LOCATIONS,
  PERSON_OPTIONS,
} from './constants.js';

const sleepLocationSchema = z
  .enum(['papa', 'mama', 'oma', 'omi', 'opi'])
  .nullable();

const personSchema = z.enum(PERSON_OPTIONS).nullable();
const activitySchema = z.enum(ACTIVITIES).nullable();

const calendarEntryBaseSchema = z.object({
  daytimeLocation: z.enum(DAYTIME_LOCATIONS).nullable().optional(),
  daytimeLocationOther: z.string().max(100).nullable().optional(),
  activity: activitySchema.optional(),
  activityOther: z.string().max(100).nullable().optional(),
  sleepLocation: sleepLocationSchema.optional(),
  broughtBy: personSchema.optional(),
  broughtByOther: z.string().max(100).nullable().optional(),
  pickedUpBy: personSchema.optional(),
  pickedUpByOther: z.string().max(100).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  version: z.number().int().positive().optional(),
});

export const calendarEntryInputSchema = calendarEntryBaseSchema.superRefine(
  (data, ctx) => {
    if (data.daytimeLocation === 'andere' && !data.daytimeLocationOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vul een locatie in bij "Andere".',
        path: ['daytimeLocationOther'],
      });
    }
    if (data.activity === 'andere' && !data.activityOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vul een activiteit in bij "Andere".',
        path: ['activityOther'],
      });
    }
    if (data.broughtBy === 'andere' && !data.broughtByOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vul een naam in bij "Andere".',
        path: ['broughtByOther'],
      });
    }
    if (data.pickedUpBy === 'andere' && !data.pickedUpByOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vul een naam in bij "Andere".',
        path: ['pickedUpByOther'],
      });
    }
  },
);

export const bulkCalendarSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entry: calendarEntryBaseSchema.omit({ version: true }),
});

export const copyCalendarSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Voer uw gebruikersnaam in.')
    .max(255),
  password: z.string().min(1, 'Voer uw wachtwoord in.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Voer uw huidige wachtwoord in.'),
    newPassword: z
      .string()
      .min(8, 'Het nieuwe wachtwoord moet minimaal 8 tekens bevatten.'),
    confirmPassword: z.string().min(1, 'Bevestig uw nieuwe wachtwoord.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'De wachtwoorden komen niet overeen.',
    path: ['confirmPassword'],
  });

export const importJsonSchema = z.object({
  entries: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      daytimeLocation: z.enum(DAYTIME_LOCATIONS).nullable().optional(),
      daytimeLocationOther: z.string().nullable().optional(),
      activity: activitySchema.optional(),
      activityOther: z.string().nullable().optional(),
      sleepLocation: sleepLocationSchema.optional(),
      broughtBy: personSchema.optional(),
      broughtByOther: z.string().nullable().optional(),
      pickedUpBy: personSchema.optional(),
      pickedUpByOther: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
    }),
  ),
});

export const settingsUpdateSchema = z.object({
  householdName: z.string().min(1).max(100).optional(),
  displaySettings: z
    .object({
      sleep: z.record(z.any()).optional(),
      daytime: z.record(z.any()).optional(),
      activities: z.record(z.any()).optional(),
      persons: z.record(z.any()).optional(),
    })
    .optional(),
});

export type CalendarEntryInput = z.infer<typeof calendarEntryInputSchema>;
export type BulkCalendarInput = z.infer<typeof bulkCalendarSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ImportJsonInput = z.infer<typeof importJsonSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export { sleepLocationSchema, personSchema, activitySchema };
