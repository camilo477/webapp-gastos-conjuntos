import { useEffect, useMemo, useState } from 'react';
import { financialEventV2Schema, projectFinancialEvents, summarizeTrip } from '../../domain';
import type { FinancialEventV2Dto, TripContext } from '../../domain';
import { watchEvents, watchPeople } from '../../repositories/financial/events';
import type { EventCollection } from '../../repositories/financial/events';
import type { TripRecord } from '../../repositories/access/contracts';
import { useSession } from '../access/session';
import { useNetwork } from '../../app/useNetwork';
import { useLocalTrip } from '../../sync/useLocalTrip';
import { useSyncServices } from '../../sync/context';
import { retryDelay } from '../../sync/coordinator';

export function useFinance(trip: TripRecord) {
  const { client,user } = useSession(), uid = user!.uid, online = useNetwork(), services = useSyncServices(), local = useLocalTrip(trip.id);
  const [events,setEvents] = useState<{ key: string;value: EventCollection } | null>(null);
  const [people,setPeople] = useState<{ key: string;value: TripContext | null;confirmed: boolean } | null>(null);
  const [failure,setFailure] = useState(''), [cacheError,setCacheError] = useState('');
  const [downloaded,setDownloaded] = useState<{ trip: TripRecord;context: TripContext;collection: EventCollection } | null>(null);
  const [now,setNow] = useState(() => new Date().toISOString());
  const eventKey = `${uid}/${trip.id}`, peopleKey = `${eventKey}/${trip.membershipVersion}`;
  useEffect(() => watchEvents(client,trip.id,uid,value => setEvents({ key: eventKey,value }),() => { setFailure(eventKey); void services?.store.block(trip.id).catch(() => {}); }),[client,trip.id,uid,eventKey,services]);
  useEffect(() => watchPeople(client,trip,uid,value => setPeople(previous => ({ key: peopleKey,value: value ?? (previous?.key.startsWith(`${eventKey}/`) ? previous.value : null),confirmed: value !== null })),() => setFailure(eventKey)),[client,trip,uid,peopleKey,eventKey]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date().toISOString()),60000); return () => window.clearInterval(timer); },[]);
  const liveContext = people?.key === peopleKey ? people.value : null;
  const context = liveContext ?? local.trip?.context ?? null;
  const collection = events?.key === eventKey ? events.value : null;
  const serverComplete = !!collection?.complete && people?.key === peopleKey && people.confirmed && online;
  const rootPresent = !!collection?.events.some(raw => raw && typeof raw === 'object' && 'operationId' in raw && raw.operationId === trip.budgetEntityId);
  useEffect(() => {
    if (!services || !serverComplete || !liveContext || !collection || !rootPresent) return;
    let active = true,attempts = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const download = async () => {
      try { await services.store.cache(trip,liveContext,collection.events); if (active) { setCacheError(''); setDownloaded({ trip,context: liveContext,collection }); } }
      catch {
        if (!active) return;
        setCacheError('No se pudo completar la descarga en este dispositivo. No salgas sin copiar los datos pendientes.');
        retry = setTimeout(() => { void download(); },retryDelay(++attempts));
      }
    };
    void download();
    return () => { active = false; clearTimeout(retry); };
  },[services,serverComplete,liveContext,collection,rootPresent,trip]);
  const pending = local.groups.filter(group => group.state !== 'confirmed');
  const pendingJson = JSON.stringify(pending.filter(group => group.state !== 'rejected').flatMap(group => group.events));
  const pendingEvents = useMemo(() => JSON.parse(pendingJson) as unknown[],[pendingJson]);
  const rawEvents = useMemo(() => {
    const merged = new Map<string,unknown>();
    for (const [index,raw] of [...(local.trip?.events ?? []),...(collection?.events ?? []),...pendingEvents].entries()) {
      const id = raw && typeof raw === 'object' && 'operationId' in raw ? String(raw.operationId) : `invalid-${index}`;
      // A confirmed server event supersedes only its own tentative receipt metadata.
      if (!merged.has(id) || !pendingEvents.includes(raw)) merged.set(id,raw);
    }
    return [...merged.values()];
  },[local.trip?.events,collection?.events,pendingEvents]);
  const validEvents = useMemo(() => rawEvents.flatMap(raw => { const parsed = financialEventV2Schema.safeParse(raw); return parsed.success ? [parsed.data] : []; }),[rawEvents]);
  const hasRoot = validEvents.some(event => event.operationId === trip.budgetEntityId && event.entityKind === 'budget' && event.action === 'create');
  const complete = serverComplete && hasRoot && pending.length === 0 && !local.trip?.blocked;
  const localComplete = hasRoot && (serverComplete || !!local.trip?.downloaded);
  const localState = useMemo(() => context ? projectFinancialEvents(context,rawEvents,localComplete) : null,[context,rawEvents,localComplete]);
  const state = useMemo(() => !localState || complete ? localState : { ...localState,provisional: true,issues: [...localState.issues,{ kind: 'collection' as const,entityId: null,reason: 'incomplete' as const }] },[localState,complete]);
  const summary = useMemo(() => state ? summarizeTrip(state,now) : null,[state,now]);
  const heads = useMemo(() => { const referenced = new Set(validEvents.flatMap(event => event.parentIds)); return validEvents.filter(event => !referenced.has(event.operationId)); },[validEvents]);
  const canWrite = !!local.trip?.downloaded && !local.trip.blocked && trip.status === 'active' && !!trip.memberBindings[uid] && !!context && context.people.length === trip.participantIds.length;
  const cachePending = !!services && serverComplete && rootPresent && (downloaded?.trip !== trip || downloaded.context !== liveContext || downloaded.collection !== collection);
  return { context,state,localState,summary,events: validEvents,heads,complete,invalidCount: collection?.invalidCount ?? 0,failed: failure === eventKey,now,pending,canWrite,offlineReady: !!local.trip?.downloaded,cachePending,storageError: cacheError || local.error,services };
}
export type Finance = ReturnType<typeof useFinance>;
export function editableHead(finance: Finance,entityId: string,kind: FinancialEventV2Dto['entityKind']) {
  const heads = finance.heads.filter(event => event.entityId === entityId && event.entityKind === kind);
  return heads.length === 1 && !finance.localState?.issues.some(issue => issue.entityId === entityId) ? heads[0] : null;
}
