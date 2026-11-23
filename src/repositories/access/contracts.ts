import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { currencyExponent, currencySchema, daySchema, inclusiveDays, moneySchema, operationIdSchema, personIdSchema, timezoneSchema } from '../../domain';

export const displayNameSchema = z.string().trim().min(1).max(60);
export const coverSchema = z.union([z.null(), z.strictObject({ kind: z.literal('icon'), key: z.enum(['mountain','car','wallet']) })]);
export const metadataSchema = z.strictObject({
  title: z.string().trim().min(1).max(100), destination: z.string().trim().max(120).nullable(),
  cover: coverSchema,
});
export type TripMetadata = z.infer<typeof metadataSchema>;
export const tripInputSchema = metadataSchema.extend({
  startDate: daySchema, endDate: daySchema, timezone: timezoneSchema, currency: currencySchema,
  budget: moneySchema.nullable(),
}).superRefine((trip, ctx) => {
  try { inclusiveDays(trip.startDate, trip.endDate); } catch { ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'El viaje debe durar entre 1 y 366 días.' }); }
});
export type TripInput = z.infer<typeof tripInputSchema>;
const timestamp = z.instanceof(Timestamp);
export const tripDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1), ownerId: personIdSchema, title: z.string().min(1).max(100), destination: z.string().max(120).nullable(),
  startDate: daySchema, endDate: daySchema, timezone: timezoneSchema, currency: currencySchema, currencyExponent: z.union([z.literal(0),z.literal(2)]),
  status: z.enum(['active','closed']), memberBindings: z.record(personIdSchema, personIdSchema), activeUids: z.array(personIdSchema).min(1).max(10),
  participantIds: z.array(personIdSchema).min(1).max(1000), budgetEntityId: operationIdSchema, cover: coverSchema,
  metadataVersion: z.number().int().nonnegative(), membershipVersion: z.number().int().nonnegative(),
  createdAt: timestamp, updatedAt: timestamp, closedAt: timestamp.nullable(),
}).superRefine((trip, ctx) => {
  if (trip.currencyExponent !== currencyExponent(trip.currency) || new Set(trip.activeUids).size !== trip.activeUids.length
    || Object.keys(trip.memberBindings).length !== trip.activeUids.length || trip.activeUids.some(uid => !trip.memberBindings[uid])
    || new Set(Object.values(trip.memberBindings)).size !== trip.activeUids.length || !trip.activeUids.includes(trip.ownerId)) ctx.addIssue({ code: 'custom', message: 'Metadatos de acceso incompatibles.' });
});
export type TripRecord = z.infer<typeof tripDocumentSchema> & { id: string };
export const memberDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  personId: personIdSchema, displayName: displayNameSchema, role: z.enum(['owner','member']), status: z.enum(['active','revoked']),
  inviteId: z.string().nullable(), joinedAt: timestamp, revokedAt: timestamp.nullable(),
});
export type MemberRecord = z.infer<typeof memberDocumentSchema> & { uid: string };
export const inviteDocumentSchema = z.strictObject({ schemaVersion: z.literal(1), createdBy: personIdSchema, createdAt: timestamp, expiresAt: timestamp, revoked: z.boolean() });
export type InviteRecord = z.infer<typeof inviteDocumentSchema> & { token: string };
