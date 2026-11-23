import { useEffect, useMemo, useState } from 'react';
import { financialEventV2Schema, projectFinancialEvents, summarizeTrip } from '../../domain';
import type { FinancialEventV2Dto, TripContext } from '../../domain';
import { watchEvents, watchPeople } from '../../repositories/financial/events';
import type { EventCollection } from '../../repositories/financial/events';
import type { TripRecord } from '../../repositories/access/contracts';
import { useSession } from '../access/session';
import { useNetwork } from '../../app/useNetwork';

export function useFinance(trip: TripRecord) {
  const { client, user } = useSession(), uid = user!.uid, online = useNetwork();
  const [events, setEvents] = useState<{ key: string; value: EventCollection } | null>(null);
  const [people, setPeople] = useState<{ key: string; value: TripContext | null; confirmed: boolean } | null>(null);
  const [failure, setFailure] = useState('');
  const [now, setNow] = useState(() => new Date().toISOString());
  const eventKey = `${uid}/${trip.id}`, peopleKey = `${eventKey}/${trip.membershipVersion}`;
  useEffect(() => watchEvents(client, trip.id, uid, value => { setEvents({ key: eventKey, value }); }, () => setFailure(eventKey)), [client, trip.id, uid, eventKey]);
  useEffect(() => watchPeople(client, trip, uid, value => {
    setPeople(previous => ({ key: peopleKey, value: value ?? (previous?.key.startsWith(`${eventKey}/`) ? previous.value : null), confirmed: value !== null }));
  }, () => setFailure(eventKey)), [client, trip, uid, peopleKey, eventKey]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date().toISOString()), 60000); return () => window.clearInterval(timer); }, []);
  const context = people?.key === peopleKey ? people.value : null;
  const collection = events?.key === eventKey ? events.value : null;
  const confirmed = !!collection?.complete && people?.key === peopleKey && people.confirmed && online;
  const rawEvents = collection?.events;
  const validEvents = useMemo(() => (rawEvents ?? []).flatMap(raw => {
    const parsed = financialEventV2Schema.safeParse(raw); return parsed.success ? [parsed.data] : [];
  }), [rawEvents]);
  const complete = confirmed && validEvents.some(event => event.operationId === trip.budgetEntityId && event.entityId === trip.budgetEntityId && event.entityKind === 'budget' && event.action === 'create');
  const state = useMemo(() => context && rawEvents ? projectFinancialEvents(context, rawEvents, complete) : null, [context, rawEvents, complete]);
  const summary = useMemo(() => state ? summarizeTrip(state, now) : null, [state, now]);
  const heads = useMemo(() => {
    const referenced = new Set(validEvents.flatMap(event => event.parentIds));
    return validEvents.filter(event => !referenced.has(event.operationId));
  }, [validEvents]);
  return { context, state, summary, events: validEvents, heads, complete, invalidCount: collection?.invalidCount ?? 0, failed: failure === eventKey, now };
}
export type Finance = ReturnType<typeof useFinance>;
export function editableHead(finance: Finance, entityId: string, kind: FinancialEventV2Dto['entityKind']) {
  const heads = finance.heads.filter(event => event.entityId === entityId && event.entityKind === kind);
  return heads.length === 1 && !finance.state?.issues.some(issue => issue.entityId === entityId) ? heads[0] : null;
}
