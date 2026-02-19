
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Expense, Project, TransactionStatus } from '../types';
import { supabase } from '../lib/supabase';

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

// Helper to map DB row -> frontend Expense
function mapDbExpense(row: any): Expense {
  return {
    id: row.id,
    merchant: row.merchant,
    expenseName: row.expense_name || undefined,
    amount: Number(row.amount),
    date: row.date,
    time: row.time || '',
    category: row.category || 'General',
    icon: row.icon || 'receipt',
    projectId: row.project_id || null,
    status: row.status as TransactionStatus,
    logoUrl: row.logo_url || undefined,
    description: row.description || undefined,
    error: row.error || false,
    attachments: row.attachments_list || [],
  };
}

// Helper to map DB row -> frontend Project
function mapDbProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    budget: Number(row.budget),
    createdDate: row.created_date,
    status: row.status as 'unsubmitted' | 'submitted',
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectRows, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;
      setProjects((projectRows || []).map(mapDbProject));

      // Fetch expenses with their attachments
      const { data: expenseRows, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (expErr) throw expErr;

      // Fetch attachments separately
      const { data: attachmentRows } = await supabase
        .from('attachments')
        .select('*');

      const attachmentsByExpense: Record<string, any[]> = {};
      (attachmentRows || []).forEach((att: any) => {
        if (!attachmentsByExpense[att.expense_id]) {
          attachmentsByExpense[att.expense_id] = [];
        }
        attachmentsByExpense[att.expense_id].push({
          id: att.id,
          url: att.url,
          type: att.type,
          name: att.name,
        });
      });

      const mappedExpenses = (expenseRows || []).map((row: any) => ({
        ...mapDbExpense(row),
        attachments: attachmentsByExpense[row.id] || [],
      }));

      setExpenses(mappedExpenses);
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    // Build the DB update object (convert camelCase to snake_case)
    const dbUpdates: Record<string, any> = {};
    if (updates.merchant !== undefined) dbUpdates.merchant = updates.merchant;
    if (updates.expenseName !== undefined) dbUpdates.expense_name = updates.expenseName;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.error !== undefined) dbUpdates.error = updates.error;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('expenses')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating expense:', error);
      return;
    }

    // Handle attachments update
    if (updates.attachments !== undefined) {
      // Delete existing attachments for this expense
      await supabase.from('attachments').delete().eq('expense_id', id);

      // Insert new attachments
      if (updates.attachments.length > 0) {
        const attInserts = updates.attachments.map(att => ({
          id: att.id,
          expense_id: id,
          url: att.url,
          type: att.type,
          name: att.name,
        }));
        await supabase.from('attachments').insert(attInserts);
      }
    }

    // Optimistic update in state
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addExpense = async (expense: Omit<Expense, 'id'>): Promise<string> => {
    const id = crypto.randomUUID();

    const { error } = await supabase.from('expenses').insert({
      id,
      merchant: expense.merchant,
      expense_name: expense.expenseName || expense.merchant,
      amount: expense.amount,
      date: expense.date,
      time: expense.time,
      category: expense.category,
      icon: expense.icon,
      project_id: expense.projectId || null,
      status: expense.status,
      logo_url: expense.logoUrl || '',
      description: expense.description || '',
      error: expense.error || false,
    });

    if (error) {
      console.error('Error adding expense:', error);
      return id;
    }

    // Handle attachments
    if (expense.attachments && expense.attachments.length > 0) {
      const attInserts = expense.attachments.map(att => ({
        id: att.id,
        expense_id: id,
        url: att.url,
        type: att.type,
        name: att.name,
      }));
      await supabase.from('attachments').insert(attInserts);
    }

    // Optimistic update
    setExpenses(prev => [{ ...expense, id }, ...prev]);
    return id;
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      console.error('Error deleting expense:', error);
      return;
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addProject = async (name: string): Promise<string> => {
    // Get sequential ID from Postgres function
    const { data: seqId, error: seqErr } = await supabase.rpc('next_project_id');
    if (seqErr || !seqId) {
      console.error('Error getting next project ID:', seqErr);
      throw new Error('Failed to generate project ID');
    }
    const id = seqId as string;
    const createdDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const { error } = await supabase.from('projects').insert({
      id,
      name,
      description: '',
      budget: 0,
      created_date: createdDate,
      status: 'unsubmitted',
    });

    if (error) {
      console.error('Error adding project:', error);
      return id;
    }

    // Optimistic update
    setProjects(prev => [...prev, {
      id,
      name,
      description: '',
      budget: 0,
      createdDate,
      status: 'unsubmitted'
    }]);

    return id;
  };

  const submitProject = async (projectId: string) => {
    // Update project status
    const { error: projErr } = await supabase
      .from('projects')
      .update({ status: 'submitted', updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (projErr) {
      console.error('Error submitting project:', projErr);
      return;
    }

    // Update all expenses linked to this project
    const { error: expErr } = await supabase
      .from('expenses')
      .update({ status: TransactionStatus.SUBMITTED, updated_at: new Date().toISOString() })
      .eq('project_id', projectId);

    if (expErr) {
      console.error('Error updating expenses status:', expErr);
      return;
    }

    // Optimistic updates
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: 'submitted' } : p));
    setExpenses(prev => prev.map(e => e.projectId === projectId ? { ...e, status: TransactionStatus.SUBMITTED } : e));
  };

  const deleteProject = async (id: string) => {
    // Unlink expenses from this project first
    const { error: unlinkErr } = await supabase
      .from('expenses')
      .update({ project_id: null, status: TransactionStatus.PENDING, updated_at: new Date().toISOString() })
      .eq('project_id', id);

    if (unlinkErr) {
      console.error('Error unlinking expenses:', unlinkErr);
      return;
    }

    // Delete the project
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
      return;
    }

    // Optimistic updates
    setExpenses(prev => prev.map(e => e.projectId === id ? { ...e, projectId: null, status: TransactionStatus.PENDING } : e));
    setProjects(prev => prev.filter(p => p.id !== id));
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
