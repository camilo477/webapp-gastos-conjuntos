import { createContext, useContext } from 'react';
import type { OfflineStore } from './storage';
import type { SyncCoordinator } from './coordinator';
export interface SyncServices { store: OfflineStore;coordinator: SyncCoordinator }
export const syncContext = createContext<SyncServices | null>(null);
export const useSyncServices = () => useContext(syncContext);
