import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANSq8O4I26mzNBDrU6MkDuXbDnJFnrnmk",
  authDomain: "task-activity-management.firebaseapp.com",
  projectId: "task-activity-management",
  storageBucket: "task-activity-management.firebasestorage.app",
  messagingSenderId: "564723178604",
  appId: "1:564723178604:web:1918cb49ee4dae289a0c49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;