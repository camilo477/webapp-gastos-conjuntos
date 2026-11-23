import { createContext, useContext } from 'react';
import type { FirebaseClient } from '../../repositories/firebase/client';

export interface SessionUser { uid: string; email: string | null; displayName: string | null; emailVerified: boolean; isAnonymous: boolean }
export interface Session { client: FirebaseClient; user: SessionUser | null }
export const sessionContext = createContext<Session | null>(null);
export function useSession(): Session {
  const session = useContext(sessionContext);
  if (!session) throw new Error('SessionProvider required.');
  return session;
}
