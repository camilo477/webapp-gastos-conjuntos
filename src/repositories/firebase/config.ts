export type FirebaseEnvironment = Readonly<Record<string, string | boolean | undefined>>;

export type FirebaseConfiguration =
  | { status: 'demo'; message: string }
  | { status: 'invalid'; message: string }
  | {
      status: 'emulators';
      options: { apiKey: string; appId: string; projectId: string; authDomain: string };
      host: string;
      authPort: number;
      firestorePort: number;
    };

function port(value: string | boolean | undefined): number | null {
  if (typeof value !== 'string' || !/^\d{1,5}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 65535 ? parsed : null;
}

export function readFirebaseConfiguration(env: FirebaseEnvironment, development: boolean): FirebaseConfiguration {
  const mode = env.VITE_FIREBASE_MODE;
  if (mode === undefined || mode === '' || mode === 'demo') {
    return { status: 'demo', message: 'Firebase sin configurar. La demostración funciona sin conexión a servicios.' };
  }
  if (mode !== 'emulators' || !development) {
    return { status: 'invalid', message: 'Solo se permite Firebase con emuladores locales durante el desarrollo. La demostración sigue disponible.' };
  }
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const appId = env.VITE_FIREBASE_APP_ID;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const host = env.VITE_FIREBASE_EMULATOR_HOST;
  const authPort = port(env.VITE_FIREBASE_AUTH_EMULATOR_PORT);
  const firestorePort = port(env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT);
  if (
    typeof projectId !== 'string' || !/^demo-[a-z0-9-]+$/.test(projectId) ||
    typeof apiKey !== 'string' || !apiKey.trim() ||
    typeof appId !== 'string' || !appId.trim() ||
    typeof authDomain !== 'string' || !authDomain.trim() ||
    (host !== '127.0.0.1' && host !== 'localhost') ||
    authPort === null || firestorePort === null || authPort === firestorePort
  ) {
    return { status: 'invalid', message: 'Configuración local incompleta o inválida. Revisa .env.example; se requiere un proyecto demo- y puertos distintos en loopback.' };
  }
  return { status: 'emulators', options: { projectId, apiKey, appId, authDomain }, host, authPort, firestorePort };
}

export const firebaseConfiguration = readFirebaseConfiguration(import.meta.env, import.meta.env.DEV);
