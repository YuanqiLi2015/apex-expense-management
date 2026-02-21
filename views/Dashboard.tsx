
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { expenses, projects, loading } = useAppContext();

    const totalSpending = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const assignedTotal = useMemo(() => expenses.filter(e => e.projectId).reduce((sum, e) => sum + e.amount, 0), [expenses]);

    const submitted = useMemo(() => expenses.filter(e => e.status === 'SUBMITTED').reduce((sum, e) => sum + e.amount, 0), [expenses]);

    const recentExpenses = useMemo(() => {
        return [...expenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3)
            .map(e => ({
                ...e,
                projectName: projects.find(p => p.id === e.projectId)?.name || 'Unassigned'
            }));
    }, [expenses, projects]);

    const radius = 32;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;

    const assignedRatio = totalSpending > 0 ? assignedTotal / totalSpending : 0;
    const assignedDash = assignedRatio * circumference;

    const submittedRatio = assignedTotal > 0 ? submitted / assignedTotal : 0;
    const submittedDash = submittedRatio * circumference;

    const unassignedCount = expenses.filter(e => !e.projectId).length;
    const unsubmittedCount = projects.filter(p => p.status === 'unsubmitted').length;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#FBFBFE]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm font-bold">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-32 bg-[#FBFBFE] font-sans">
            <header className="sticky top-0 z-30 bg-[#FBFBFE]/90 backdrop-blur-xl px-6 pt-12 pb-5 border-b border-gray-100/50">
                <div className="flex items-center justify-between h-12">
                    <h1 className="text-[32px] font-[900] text-secondary tracking-tight">Dashboard</h1>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-card text-secondary hover:bg-gray-50 transition-all border border-gray-100 active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[24px]">settings</span>
                    </button>
                </div>
            </header>

            <main className="px-6 pt-8">
                <div className="w-full bg-white rounded-[2.5rem] shadow-executive p-7 mb-10 border border-gray-100/50">
                    <div className="flex items-center justify-between mb-8 px-1 gap-4">
                        <h2 className="text-[20px] xs:text-[24px] font-[900] text-[#D4AF37] tracking-tighter uppercase whitespace-nowrap">Spending Overview</h2>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 whitespace-nowrap shrink-0">REAL-TIME</span>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4 bg-[#0f172a]/5 p-6 rounded-[2rem] border border-[#0f172a]/5 hover:bg-[#0f172a]/10 transition-colors">
                            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90 overflow-visible">
                                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#E2E8F0" strokeWidth={strokeWidth} />
                                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#D4AF37" strokeWidth={strokeWidth} strokeDasharray={`${assignedDash} ${circumference}`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-[800] text-gray-400 uppercase tracking-normal">TOTAL EXPENDITURE</span>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-[14px] font-[900] text-secondary opacity-50 mb-1">¥</span>
                                        <span className="text-[24px] font-[900] text-secondary leading-tight tracking-tight tabular-nums">
                                            {totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-200/50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]"></div>
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Assigned</span>
                                        </div>
                                        <div className="flex items-baseline justify-end gap-0.5 ml-auto">
                                            <span className="text-[10px] font-black text-secondary opacity-40">¥</span>
                                            <span className="text-[13px] font-black text-secondary tracking-tight tabular-nums">
                                                {assignedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-[#D4AF37]/5 p-6 rounded-[2rem] border border-[#D4AF37]/10 hover:bg-[#D4AF37]/10 transition-colors">
                            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90 overflow-hidden">
                                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#EAD694" strokeWidth={strokeWidth} />
                                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#D4AF37" strokeWidth={strokeWidth} strokeDasharray={`${submittedDash} ${circumference}`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-[800] text-[#D4AF37]/80 uppercase tracking-normal">SUBMISSION STATUS</span>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-[14px] font-[900] text-[#D4AF37] opacity-60 mb-1">¥</span>
                                        <span className="text-[24px] font-[900] text-[#D4AF37] leading-tight tracking-tight tabular-nums">
                                            {assignedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5 pt-1 border-t border-[#D4AF37]/10">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]"></div>
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Submitted</span>
                                        </div>
                                        <div className="flex items-baseline justify-end gap-0.5 ml-auto">
                                            <span className="text-[10px] font-black text-secondary opacity-40">¥</span>
                                            <span className="text-[13px] font-black text-secondary tracking-tight tabular-nums">
                                                {submitted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h2 className="text-[22px] font-[900] text-secondary mb-7 px-1 flex items-center gap-3 tracking-tight">
                        Required Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div
                            onClick={() => navigate('/expenses')}
                            className="bg-white rounded-[2.5rem] p-6 shadow-soft hover:shadow-card transition-all duration-300 group cursor-pointer border border-gray-100 hover:border-[#D4AF37]/30 active:scale-95"
                        >
                            <div className="flex justify-between items-start mb-5">
                                <div className="p-3.5 bg-red-50 rounded-2xl text-red-500 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[34px] fill-1">receipt_long</span>
                                </div>
                                {unassignedCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-200">{unassignedCount}</span>}
                            </div>
                            <h3 className="text-secondary font-[800] text-[15px] uppercase tracking-normal">Unassigned</h3>

                        </div>
                        <div
                            onClick={() => navigate('/projects')}
                            className="bg-white rounded-[2.5rem] p-6 shadow-soft hover:shadow-card transition-all duration-300 group cursor-pointer border border-gray-100 hover:border-[#D4AF37]/30 active:scale-95"
                        >
                            <div className="flex justify-between items-start mb-5">
                                <div className="p-3.5 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37] group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[34px] fill-1">folder_open</span>
                                </div>
                                {unsubmittedCount > 0 && <span className="bg-[#D4AF37] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-[#D4AF37]/20">{unsubmittedCount}</span>}
                            </div>
                            <h3 className="text-secondary font-[800] text-[15px] uppercase tracking-normal">Pending</h3>

                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-7 px-1">
                        <h2 className="text-[22px] font-[900] text-secondary tracking-tight">Recent Activity</h2>
                        <button
                            onClick={() => navigate('/expenses')}
                            className="text-[#D4AF37] text-[10px] font-black uppercase tracking-normal hover:bg-[#D4AF37]/10 transition-colors py-2.5 px-5 bg-[#D4AF37]/5 rounded-full border border-[#D4AF37]/10"
                        >
                            EXPLORE ALL
                        </button>
                    </div>
                    <div className="flex flex-col gap-5">
                        {recentExpenses.map((tx) => (
                            <div
                                key={tx.id}
                                onClick={() => navigate('/review', { state: { expense: tx } })}
                                className="flex items-center gap-4 p-6 bg-white rounded-[2.5rem] shadow-soft border border-gray-100/50 hover:shadow-card hover:border-[#D4AF37]/20 transition-all cursor-pointer group active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-[#64748B] group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/5 transition-all border border-gray-100/50 shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">{tx.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-secondary font-[800] text-[15px] leading-tight mb-1 group-hover:text-primary transition-colors truncate">{tx.merchant}</p>
                                    <p className="text-gray-400 text-[10px] font-black tracking-normal uppercase truncate">{tx.date.split(',')[0]} • {tx.category}</p>
                                </div>
                                <div className="text-right shrink-0 pl-3">
                                    <span className="text-secondary font-[900] text-[16px] tracking-tight whitespace-nowrap">-¥{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <p className={`text-[9px] font-black tracking-normal mt-1.5 uppercase ${tx.status === 'APPROVED' ? 'text-green-500' : 'text-gray-400'}`}>{tx.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
