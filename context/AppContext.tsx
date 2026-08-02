
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Expense, Project, TransactionStatus } from '../types';
import { getLocalProjects, saveLocalProject, deleteLocalProject, getLocalExpenses, saveLocalExpense, deleteLocalExpense, getNextProjectId } from '../lib/db';

interface AppContextType {
  expenses: Expense[];
  projects: Project[];
  loading: boolean;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<string>;
  deleteExpense: (id: string) => Promise<void>;
  addProject: (name: string) => Promise<string>;
  deleteProject: (id: string) => Promise<void>;
  submitProject: (projectId: string) => Promise<void>;
  getProjectSpend: (projectId: string) => number;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const storedProjects = await getLocalProjects();
      const storedExpenses = await getLocalExpenses();

      setProjects(storedProjects);
      setExpenses(storedExpenses);
    } catch (err) {
      console.error('Error fetching data from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const existing = expenses.find(e => e.id === id);
    if (!existing) return;

    const updatedExpense: Expense = {
      ...existing,
      ...updates,
    };

    try {
      await saveLocalExpense(updatedExpense);
      setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
    } catch (err) {
      console.error('Error updating expense in IndexedDB:', err);
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>): Promise<string> => {
    const id = crypto.randomUUID();
    const newExpense: Expense = {
      ...expense,
      id,
    };

    try {
      await saveLocalExpense(newExpense);
      setExpenses(prev => [newExpense, ...prev]);
    } catch (err) {
      console.error('Error adding expense to IndexedDB:', err);
    }

    return id;
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteLocalExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting expense from IndexedDB:', err);
    }
  };

  const addProject = async (name: string): Promise<string> => {
    const id = await getNextProjectId();
    const createdDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const newProject: Project = {
      id,
      name,
      description: '',
      budget: 0,
      createdDate,
      status: 'unsubmitted',
    };

    try {
      await saveLocalProject(newProject);
      setProjects(prev => [...prev, newProject]);
    } catch (err) {
      console.error('Error adding project to IndexedDB:', err);
    }

    return id;
  };

  const submitProject = async (projectId: string) => {
    try {
      const targetProject = projects.find(p => p.id === projectId);
      if (targetProject) {
        const updatedProject: Project = { ...targetProject, status: 'submitted' };
        await saveLocalProject(updatedProject);
        setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
      }

      // Update associated expenses status to SUBMITTED
      const updatedExpenses = await Promise.all(
        expenses.map(async (e) => {
          if (e.projectId === projectId) {
            const updated = { ...e, status: TransactionStatus.SUBMITTED };
            await saveLocalExpense(updated);
            return updated;
          }
          return e;
        })
      );
      setExpenses(updatedExpenses);
    } catch (err) {
      console.error('Error submitting project in IndexedDB:', err);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      // Unlink expenses
      const updatedExpenses = await Promise.all(
        expenses.map(async (e) => {
          if (e.projectId === id) {
            const updated = { ...e, projectId: null, status: TransactionStatus.PENDING };
            await saveLocalExpense(updated);
            return updated;
          }
          return e;
        })
      );
      setExpenses(updatedExpenses);

      await deleteLocalProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting project from IndexedDB:', err);
    }
  };

  const getProjectSpend = (projectId: string) => {
    return expenses
      .filter(e => e.projectId === projectId)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const value = {
    expenses,
    projects,
    loading,
    updateExpense,
    addExpense,
    deleteExpense,
    addProject,
    deleteProject,
    submitProject,
    getProjectSpend,
    refreshData: fetchData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

