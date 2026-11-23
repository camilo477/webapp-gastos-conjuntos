export function accessError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const messages: Record<string,string> = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.', 'auth/invalid-email': 'Introduce un correo válido.',
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta.', 'auth/weak-password': 'Utiliza una contraseña de al menos seis caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.', 'auth/network-request-failed': 'No se pudo contactar con el emulador de autenticación.',
    'permission-denied': 'Operación no autorizada. La invitación puede no estar vigente, el grupo estar completo o tu acceso haber cambiado.',
    'unavailable': 'El emulador no está disponible. Esta operación requiere conexión.',
  };
  if (code in messages) return messages[code]!;
  if (error instanceof AccessError) return error.message;
  return 'No se pudo completar la operación. Comprueba la conexión y los datos.';
}

export class AccessError extends Error {
  constructor(message: string) { super(message); this.name = 'AccessError'; }
}
