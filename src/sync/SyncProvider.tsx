import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '../features/access/session';
import { OfflineStore } from './storage';
import { SyncCoordinator } from './coordinator';
import { syncContext } from './context';
import { AttachmentService } from '../attachments/service';

export function SyncProvider({ children }: { children: ReactNode }) {
  const { client,user } = useSession(), uid = user?.uid;
  const services = useMemo(() => {
    if (!uid) return null;
    const store = new OfflineStore(client.configuration.options.projectId,uid);
    return { store,coordinator: new SyncCoordinator(store,client),attachments: new AttachmentService(store,client) };
  },[client,uid]);
  useEffect(() => {
    if (!services) return;
    services.coordinator.start();
    services.attachments.start();
    return () => { services.coordinator.stop(); services.attachments.stop(); services.store.close(); };
  },[services]);
  // Keep the provider boundary stable while invitation validation creates a session.
  // Private routes are separately keyed by UID in ConnectedShell.
  return <syncContext.Provider value={services}>{children}</syncContext.Provider>;
}
