import { Expense, Project } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  profilePic: string;
  personalEmail: string;
  secretaryEmail: string;
}

const DB_NAME = 'ApexExpenseDB';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Projects
export async function getLocalProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const req = store.put(project);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Expenses
export async function getLocalExpenses(): Promise<Expense[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('expenses', 'readonly');
    const store = tx.objectStore('expenses');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalExpense(expense: Expense): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('expenses', 'readwrite');
    const store = tx.objectStore('expenses');
    const req = store.put(expense);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalExpense(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('expenses', 'readwrite');
    const store = tx.objectStore('expenses');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Profile
export async function getLocalProfile(): Promise<UserProfile> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profiles', 'readonly');
    const store = tx.objectStore('profiles');
    const req = store.get('default_user');
    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result);
      } else {
        const defaultProf: UserProfile = {
          id: 'default_user',
          name: 'Executive User',
          role: 'Senior Executive',
          profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          personalEmail: 'user@company.com',
          secretaryEmail: 'secretary@company.com',
        };
        resolve(defaultProf);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalProfile(profile: UserProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profiles', 'readwrite');
    const store = tx.objectStore('profiles');
    const req = store.put({ ...profile, id: 'default_user' });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Helper to generate next sequential project ID (e.g. #PRJ-001)
export async function getNextProjectId(): Promise<string> {
  const projects = await getLocalProjects();
  const count = projects.length + 1;
  const numStr = String(count).padStart(3, '0');
  return `#PRJ-${numStr}`;
}
