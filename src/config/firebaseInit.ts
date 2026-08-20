import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage as fbGetStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";
import { firebaseConfig, useEmulators, emulatorConfig } from "./firebase";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (useEmulators) {
      connectAuthEmulator(
        auth,
        `http://${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`,
        { disableWarnings: true },
      );
    }
  }
  return auth;
}

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    if (useEmulators) {
      connectFirestoreEmulator(
        db,
        emulatorConfig.firestore.host,
        emulatorConfig.firestore.port,
      );
    }
  }
  return db;
}

export function getStorage(): FirebaseStorage {
  if (!storage) {
    storage = fbGetStorage(getFirebaseApp());
    if (useEmulators) {
      connectStorageEmulator(
        storage,
        emulatorConfig.firestore.host,
        9199,
      );
    }
  }
  return storage;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp());
  }
  return functions;
}