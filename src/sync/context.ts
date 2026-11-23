import { createContext, useContext } from 'react';
import type { OfflineStore } from './storage';
import type { SyncCoordinator } from './coordinator';
import type { AttachmentService } from '../attachments/service';
export interface SyncServices { store: OfflineStore;coordinator: SyncCoordinator;attachments: AttachmentService }
export const syncContext = createContext<SyncServices | null>(null);
export const useSyncServices = () => useContext(syncContext);
