const env = import.meta.env;

function required(key: keyof ImportMetaEnv, fallback?: string): string {
  const value = env[key] ?? fallback;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${String(key)}. Copy .env.example to .env and fill it.`,
    );
  }
  return value;
}

export const firebaseConfig = {
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
};

export const useEmulators = env.VITE_USE_EMULATORS === "true";
export const emulatorConfig = {
  firestore: {
    host: env.VITE_EMULAPER_FIRESTORE_HOST ?? "127.0.0.1",
    port: Number(env.VITE_EMULAPER_FIRESTORE_PORT ?? 8080),
  },
  auth: {
    host: env.VITE_EMULAPER_AUTH_HOST ?? "127.0.0.1",
    port: Number(env.VITE_EMULAPER_AUTH_PORT ?? 9099),
  },
};