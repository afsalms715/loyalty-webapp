import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCIe0aoGEGES4aejNWpRkt6WdioA4DXTis",
  authDomain: "simpleloyality.firebaseapp.com",
  projectId: "simpleloyality",
  storageBucket: "simpleloyality.firebasestorage.app",
  messagingSenderId: "356285768576",
  appId: "1:356285768576:web:cd148e59ab2685a0495765",
  measurementId: "G-4GFL8L6LHC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
