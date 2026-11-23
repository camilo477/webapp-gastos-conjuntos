import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createServer } from 'vite';

// Pure-domain workload. This measures neither network nor production quotas.
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const domain = await server.ssrLoadModule('/src/domain/index.ts');
  const context = domain.tripContextSchema.parse({ id: 'synthetic-load-trip',startDate: '2026-11-21',endDate: '2026-11-24',timezone: 'America/Bogota',currency: 'COP',currencyExponent: 0,people: ['A','B'].map(personId => ({ personId,displayName: personId,status: 'active' })) });
  const shares = domain.splitExpense(101n,{ mode: 'equal',personIds: ['A','B'] });
  const payload = { title: 'Carga sintética',note: null,total: 101,category: 'food',occurredAt: '2026-11-23T15:00:00.000Z',day: '2026-11-23',payerIds: ['A'],payerAmounts: [101],participantIds: shares.map(row => row.personId),shareAmounts: shares.map(row => domain.moneyToDto(row.amount)),splitMode: 'equal',weights: [1,1],visual: null,attachmentId: null,status: 'active',mergedInto: null };
  const result = [];
  for (const count of [500,2500,10000]) {
    const events = Array.from({ length: count },(_,index) => {
      const id = `00000000-0000-4000-8000-${index.toString(16).padStart(12,'0')}`;
      return structuredClone({ schemaVersion: 2,operationId: id,entityId: id,entityKind: 'expense',action: 'create',actorUid: 'A',actorPersonId: 'A',parentIds: [],logicalClock: 0,before: [],payload,merge: null,authoredAt: '2026-11-23T15:00:00.000Z',receivedAt: { seconds: 1795446000,nanoseconds: index } });
    });
    const heapBefore = process.memoryUsage().heapUsed, started = performance.now();
    const state = domain.projectFinancialEvents(context,events,true), projected = performance.now();
    const summary = domain.summarizeTrip(state,'2026-11-23T15:00:00.000Z'), finished = performance.now();
    if (state.provisional || summary.statistics.total !== BigInt(count) * 101n || summary.statistics.expenseCount !== count || summary.balances.rows.reduce((sum,row) => sum + row.balance,0n) !== 0n) throw new Error('Financial workload invariant failed.');
    result.push({ events: count,projectionMs: Math.round(projected-started),summaryMs: Math.round(finished-projected),jsonBytes: Buffer.byteLength(JSON.stringify(events)),heapDeltaBytes: process.memoryUsage().heapUsed-heapBefore,total: summary.statistics.total.toString(),provisional: state.provisional });
  }
  const report = { measuredAt: new Date().toISOString(),node: process.version,scope: 'Node pure domain; heap delta includes GC noise; not network/browser/production benchmark',results: result };
  await mkdir('.cache/phase5',{ recursive: true }); await writeFile('.cache/phase5/performance.json',JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2));
} finally { await server.close(); }
