
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Expense } from '../types';

type SortOption = 'date-new' | 'date-old' | 'amount-high' | 'amount-low';

const Expenses: React.FC = () => {
    const navigate = useNavigate();
    const { expenses, projects } = useAppContext();
    const [activeTab, setActiveTab] = useState<'unassigned' | 'assigned'>('unassigned');

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('date-new');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filteredAndSortedItems = useMemo(() => {
        let baseList = activeTab === 'unassigned'
            ? expenses.filter(e => !e.projectId)
            : expenses.filter(e => e.projectId);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            baseList = baseList.filter(item =>
                (item.expenseName || item.merchant).toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q) ||
                item.amount.toString().includes(q)
            );
        }

        return [...baseList].sort((a, b) => {
            if (sortBy === 'amount-high') return b.amount - a.amount;
            if (sortBy === 'amount-low') return a.amount - b.amount;
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (sortBy === 'date-old') return timeA - timeB;
            return timeB - timeA;
        });
    }, [expenses, activeTab, searchQuery, sortBy]);

    const handleItemClick = (item: Expense) => {
        navigate('/review', { state: { expense: item } });
    };

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-32 bg-[#FBFBFE] font-sans">
            <header className="sticky top-0 z-30 bg-[#FBFBFE]/90 backdrop-blur-xl px-6 pt-12 pb-4 border-b border-gray-100/50">
                <div className="flex items-center justify-between h-12 mb-6">
                    {!isSearchVisible ? (
                        <>
                            <h1 className="text-[32px] font-[900] text-secondary tracking-tight">Expenses</h1>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsSearchVisible(true)}
                                    className="w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-card text-secondary hover:bg-gray-50 transition-all border border-gray-100 active:scale-90"
                                >
                                    <span className="material-symbols-outlined text-[24px]">search</span>
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-card transition-all border border-gray-100 active:scale-90 text-secondary"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">sort</span>
                                    </button>

                                    {isFilterOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                                            <div className="absolute right-0 mt-4 w-56 bg-white rounded-[2rem] shadow-executive border border-gray-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-200 p-1">
                                                <p className="px-5 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-tight border-b border-gray-50 mb-1">SORT BY</p>
                                                {[
                                                    { id: 'date-new', label: 'Newest First', icon: 'schedule' },
                                                    { id: 'date-old', label: 'Oldest First', icon: 'history' },
                                                    { id: 'amount-high', label: 'Highest Amount', icon: 'payments' },
                                                    { id: 'amount-low', label: 'Lowest Amount', icon: 'vertical_align_bottom' },
                                                ].map((option) => (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => { setSortBy(option.id as any); setIsFilterOpen(false); }}
                                                        className={`w-full flex items-center gap-3 px-5 py-3.5 text-[13px] font-extrabold transition-all rounded-[1.25rem] ${sortBy === option.id ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-secondary hover:bg-gray-50'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">{option.icon}</span>
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search merchant, category..."
                                    className="w-full bg-white border border-gray-100 rounded-full py-3.5 pl-11 pr-5 text-sm font-bold shadow-card focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37]/30 outline-none text-secondary"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => { setIsSearchVisible(false); setSearchQuery(''); }}
                                className="text-gray-400 font-black text-[11px] px-2 hover:text-secondary transition-colors uppercase tracking-tight"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
                <div className="relative bg-[#E2E8F0]/40 p-1.5 rounded-[1.75rem] flex shadow-inner border border-gray-100/50">
                    <button
                        onClick={() => setActiveTab('unassigned')}
                        className={`flex-1 py-3 text-[11px] font-[900] rounded-[1.25rem] transition-all duration-300 uppercase tracking-tight ${activeTab === 'unassigned' ? 'bg-secondary text-white shadow-lg' : 'text-slate-500 hover:text-secondary'
                            }`}
                    >
                        Unassigned ({expenses.filter(e => !e.projectId).length})
                    </button>
                    <button
                        onClick={() => setActiveTab('assigned')}
                        className={`flex-1 py-3 text-[11px] font-[900] rounded-[1.25rem] transition-all duration-300 uppercase tracking-tight ${activeTab === 'assigned' ? 'bg-secondary text-white shadow-lg' : 'text-slate-500 hover:text-secondary'
                            }`}
                    >
                        Assigned ({expenses.filter(e => e.projectId).length})
                    </button>
                </div>
            </header>

            <main className="px-6 pt-6">
                {filteredAndSortedItems.length > 0 ? (
                    <div className="space-y-5">
                        {filteredAndSortedItems.map((item) => (
                            <ExpenseCard
                                key={item.id}
                                item={item}
                                projectName={projects.find(p => p.id === item.projectId)?.name}
                                onClick={() => handleItemClick(item)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-8 border border-gray-100">
                            <span className="material-symbols-outlined text-[54px] text-slate-200">receipt_long</span>
                        </div>
                        <h3 className="text-[20px] font-[900] text-secondary mb-2 tracking-tight">
                            {searchQuery ? 'No match found' : 'Empty list'}
                        </h3>
                        <p className="text-[13px] text-gray-400 px-12 leading-relaxed font-bold">
                            {searchQuery
                                ? `We couldn't find anything matching "${searchQuery}"`
                                : `You don't have any ${activeTab} expenses at the moment.`
                            }
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

const ExpenseCard: React.FC<{ item: Expense; projectName?: string; onClick: () => void }> = ({ item, projectName, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white rounded-[2.5rem] p-6 flex items-start gap-5 shadow-soft border border-gray-100/50 transition-all active:scale-[0.98] cursor-pointer hover:shadow-card group relative overflow-hidden"
    >
        <div className="flex-shrink-0">
            <div className="h-14 w-14 rounded-2xl bg-[#F8FAFC] flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/5 transition-all">
                <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
            </div>
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1.5">
                <h4 className="font-[900] text-secondary truncate pr-3 text-[17px] group-hover:text-[#D4AF37] transition-colors leading-tight tracking-tight">
                    {item.expenseName || item.merchant || "New Expense"}
                </h4>
                <span className="font-[900] text-secondary whitespace-nowrap text-[18px] tracking-tight group-hover:scale-105 transition-transform">-¥{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-[10px] text-gray-400 mb-5 font-[800] uppercase tracking-tight">
                {item.merchant && item.expenseName ? `${item.merchant} • ` : ""}{item.date}
            </div>

            {item.projectId ? (
                <div className="flex items-center gap-2.5 text-[#D4AF37] group-hover:translate-x-1.5 transition-transform">
                    <span className="material-symbols-outlined text-[22px] fill-1">folder_open</span>
                    <span className="text-[11px] font-[900] truncate tracking-tight">{projectName}</span>
                </div>
            ) : (
                <div className="flex items-center gap-2.5 text-[#D4AF37] group-hover:translate-x-1.5 transition-transform">
                    <span className="material-symbols-outlined text-[22px] fill-1">add_circle</span>
                    <span className="text-[11px] font-[900] tracking-tight">Assign to project</span>
                </div>
            )}
        </div>
    </div>
);

export default Expenses;
