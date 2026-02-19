
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';

const ProjectDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { expenses, projects, submitProject, deleteProject, getProjectSpend } = useAppContext();
  const [submitting, setSubmitting] = useState(false);

  const project = useMemo(() =>
    projects.find(p => p.id === id || p.id === `#${id}`),
    [projects, id]);

  if (!project) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 font-bold">Project not found</div>;
  }

  const projectExpenses = useMemo(() =>
    expenses.filter(e => e.projectId === project.id),
    [expenses, project]);

  const dynamicCategoryBreakdown = useMemo(() => {
    const categoryMap = projectExpenses.reduce((acc, tx) => {
      const cat = tx.category.toUpperCase();
      if (!acc[cat]) {
        acc[cat] = { amount: 0, icon: tx.icon };
      }
      acc[cat].amount += tx.amount;
      return acc;
    }, {} as Record<string, { amount: number; icon: string }>);

    return Object.entries(categoryMap).map(([label, data]: [string, { amount: number; icon: string }]) => ({
      label,
      amount: data.amount,
      icon: data.icon,
      progress: project.budget > 0 ? (data.amount / project.budget) * 100 : 0
    }));
  }, [projectExpenses, project.budget]);

  const handleExpenseClick = (tx: import('../types').Expense) => {
    navigate('/review', { state: { expense: tx } });
  };

  const handleOneClickSubmit = async () => {
    if (!window.confirm('Submit all expenses for this project? An email will be sent to the secretary.')) return;

    setSubmitting(true);
    try {
      // Get current auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/submit-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ projectId: project.id }),
      });

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Failed to submit report');
      }

      // Update project status in DB
      await submitProject(project.id);

      // Navigate to success page
      navigate('/submit-success', { state: { summary: result.summary } });
    } catch (err: any) {
      console.error('Submit error:', err);
      // More descriptive error for Base64/Pattern issues
      const msg = err.message === 'The string did not match the expected pattern.'
        ? 'Base64 decoding failed (malformed attachment data). Please check your receipt images.'
        : err.message;
      alert(`Submission failed: ${msg}`);
      setSubmitting(false);
    }
  };

  const handleDeleteProject = () => {
    if (window.confirm(`Delete "${project.name}"? All linked expenses will be unassigned.`)) {
      deleteProject(project.id);
      navigate('/projects');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white relative">
      <header className="sticky top-0 z-[110] bg-white/95 backdrop-blur-md px-6 pt-12 pb-4 border-b border-gray-100/50">
        <div className="flex items-center justify-between h-10">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center justify-center text-[#d4af35] active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-2xl font-black">chevron_left</span>
          </button>
          <h2 className="text-[15px] font-black tracking-tight text-[#d4af35] uppercase">Project Details</h2>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 bg-[#D4AF37]/5 border border-[#D4AF37]/10">
            <span className={`w-2 h-2 rounded-full ${project.status === 'submitted' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]'}`}></span>
            <span className="text-[10px] font-black tracking-tight text-[#D4AF37] uppercase">
              {project.status === 'unsubmitted' ? 'Pending' : 'Submitted'}
            </span>
          </div>

          <div className="mb-6 flex flex-col items-center">
            <h1 className="text-[28px] font-black text-secondary text-center leading-tight tracking-tight max-w-[300px]">
              {project.name}
            </h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight mt-3">ID: {project.id}</p>
          </div>

          <div className="flex items-center justify-center mb-12">
            <div className="flex items-start justify-center gap-1.5">
              <span className="text-[24px] font-black text-[#D4AF37] mt-3 leading-none">¥</span>
              <span className="text-6xl font-black text-[#D4AF37] tracking-tight leading-none">
                {getProjectSpend(project.id).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto hide-scrollbar pl-6 pr-2 mb-12">
          <div className="flex gap-5 w-max pb-4">
            {dynamicCategoryBreakdown.map((card, i) => (
              <div key={i} className="min-w-[120px] bg-white p-5 rounded-[2.25rem] shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center gap-4 relative overflow-hidden group">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">{card.icon}</span>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-tight mb-1.5">{card.label}</p>
                  <p className="text-[17px] font-black text-secondary tracking-tight">¥{card.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-50">
                  <div className="bg-[#D4AF37] h-full transition-all duration-1000" style={{ width: `${Math.min(card.progress, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 flex items-center justify-between mb-6">
          <h3 className="text-[22px] font-black text-secondary tracking-tight">Expenses</h3>
        </div>

        <div className="px-6 flex flex-col gap-4">
          {projectExpenses.map((tx) => (
            <div
              key={tx.id}
              onClick={() => handleExpenseClick(tx)}
              className="group flex items-center justify-between p-5 bg-[#FBFBFE] rounded-[2.25rem] border border-transparent hover:border-[#D4AF37]/20 hover:bg-white hover:shadow-soft transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-50 group-hover:bg-[#D4AF37]/5 transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[24px] group-hover:text-[#D4AF37]">{tx.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="text-[16px] font-black text-secondary leading-tight truncate pr-4 group-hover:text-[#D4AF37] transition-colors">
                    {tx.merchant}
                  </h4>
                  <span className="text-[18px] font-black text-secondary whitespace-nowrap tracking-tight">
                    ¥{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">
                  {tx.date.split(',')[0]} • {tx.category}
                </p>
              </div>
            </div>
          ))}
          {projectExpenses.length === 0 && (
            <div className="text-center py-16 text-gray-400 font-bold italic opacity-60">No expenses assigned to this project yet.</div>
          )}
        </div>

        {
          project.status === 'unsubmitted' && projectExpenses.length > 0 && (
            <div className="mt-16 mb-4 flex justify-center px-6">
              <button
                onClick={handleOneClickSubmit}
                disabled={submitting}
                className="w-full bg-[#D4AF37] text-white py-6 rounded-full shadow-fab hover:bg-[#c4a130] transition-all active:scale-[0.97] flex items-center justify-center group relative overflow-hidden disabled:opacity-60 disabled:active:scale-100"
              >
                {submitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[15px] font-black uppercase tracking-tight">Sending...</span>
                  </div>
                ) : (
                  <span className="text-[15px] font-black uppercase tracking-tight z-10">
                    ONE-CLICK SUBMIT
                  </span>
                )}
              </button>
            </div>
          )
        }

        {
          project.status === 'unsubmitted' && (
            <div className="mt-4 mb-4 flex justify-center px-6">
              <button
                onClick={handleDeleteProject}
                className="w-full py-4 rounded-full border border-red-200 text-red-400 font-black text-xs uppercase tracking-tight hover:bg-red-50 transition-colors active:scale-[0.97] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Project
              </button>
            </div>
          )
        }
      </main>
    </div>
  );
};

export default ProjectDetails;
