
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const { projects, getProjectSpend, addProject } = useAppContext();
    const [activeTab, setActiveTab] = useState<'unsubmitted' | 'submitted'>('unsubmitted');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'spend' | 'name' | 'id'>('id');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDate, setNewProjectDate] = useState(new Date().toISOString().split('T')[0]);

    const filteredAndSortedProjects = useMemo(() => {
        let baseList = projects.filter(p => p.status === activeTab);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            baseList = baseList.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q)
            );
        }

        return [...baseList].sort((a, b) => {
            if (sortBy === 'spend') return getProjectSpend(b.id) - getProjectSpend(a.id);
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'id') return b.id.localeCompare(a.id);
            return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        });
    }, [projects, activeTab, searchQuery, sortBy, getProjectSpend]);

    const handleProjectClick = (proj: any) => {
        navigate(`/projects/${proj.id.replace('#', '')}`);
    };

    const handleCreateProject = () => {
        if (newProjectName.trim()) {
            addProject(newProjectName.trim());
            setIsModalOpen(false);
            setNewProjectName('');
            setActiveTab('unsubmitted'); // Jump to Pending tab
        }
    };

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-40 bg-[#FBFBFE] font-sans">
            <header className="sticky top-0 z-30 bg-[#FBFBFE]/90 backdrop-blur-xl border-b border-gray-100/50 pt-12 pb-4">
                <div className="max-w-screen-xl mx-auto px-6">
                    <div className="flex items-center justify-between h-12 mb-6">
                        {!isSearchVisible ? (
                            <>
                                <h1 className="text-[32px] font-[900] text-secondary tracking-tight">Projects</h1>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-card text-secondary hover:bg-gray-50 transition-all border border-gray-100 active:scale-90"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">add</span>
                                    </button>

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
                                                        { id: 'id', label: 'Project ID', icon: 'tag' },
                                                        { id: 'date', label: 'Recent First', icon: 'calendar_today' },
                                                        { id: 'spend', label: 'Highest Spend', icon: 'payments' },
                                                        { id: 'name', label: 'Alphabetical', icon: 'sort_by_alpha' },
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
                                        placeholder="Find project by name or ID..."
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
                            onClick={() => setActiveTab('unsubmitted')}
                            className={`flex-1 py-3 text-[11px] font-[900] rounded-[1.25rem] transition-all duration-300 uppercase tracking-tight ${activeTab === 'unsubmitted' ? 'bg-secondary text-white shadow-lg' : 'text-slate-500 hover:text-secondary'
                                }`}
                        >
                            Pending ({projects.filter(p => p.status === 'unsubmitted').length})
                        </button>
                        <button
                            onClick={() => setActiveTab('submitted')}
                            className={`flex-1 py-3 text-[11px] font-[900] rounded-[1.25rem] transition-all duration-300 uppercase tracking-tight ${activeTab === 'submitted' ? 'bg-secondary text-white shadow-lg' : 'text-slate-500 hover:text-secondary'
                                }`}
                        >
                            Submitted ({projects.filter(p => p.status === 'submitted').length})
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-screen-xl mx-auto px-6 pt-8">
                {filteredAndSortedProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAndSortedProjects.map((proj) => (
                            <div
                                key={proj.id}
                                onClick={() => handleProjectClick(proj)}
                                className="group relative flex flex-col gap-5 rounded-[2.5rem] bg-white p-7 shadow-soft hover:shadow-executive transition-all duration-300 border border-gray-100 hover:border-[#D4AF37]/30 cursor-pointer active:scale-[0.98] overflow-hidden"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-5">
                                        <h3 className="text-[21px] font-[900] text-secondary leading-tight group-hover:text-[#D4AF37] transition-colors tracking-tight">{proj.name}</h3>
                                        <p className="text-[10px] font-black text-gray-400 mt-2.5 uppercase tracking-tight">ID: {proj.id}</p>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-slate-50 border-t border-gray-50"></div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-tight mb-1.5">INITIATED</p>
                                        <p className="text-[14px] font-[800] text-secondary/70">{proj.createdDate}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-tight mb-1.5">PROJECT SPEND</p>
                                        <p className="text-[26px] font-[900] text-[#D4AF37] tracking-tight leading-none">¥{getProjectSpend(proj.id).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                <div className="absolute right-0 top-0 w-1 h-full bg-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-8 border border-gray-100">
                            <span className="material-symbols-outlined text-[54px] text-slate-200">folder_off</span>
                        </div>
                        <h3 className="text-[20px] font-[900] text-secondary mb-2 tracking-tight">
                            {searchQuery ? 'Search failed' : 'Folder is empty'}
                        </h3>
                        <p className="text-[13px] text-gray-400 px-12 leading-relaxed font-bold">
                            {searchQuery
                                ? `No projects were found matching "${searchQuery}"`
                                : `You don't have any ${activeTab === 'unsubmitted' ? 'pending' : 'submitted'} projects currently.`
                            }
                        </p>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-secondary/30 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-executive p-10 animate-in zoom-in-95 duration-300 border border-gray-100">
                        <h2 className="text-[26px] font-[900] text-secondary mb-10 text-center tracking-tight">New Project</h2>

                        <div className="space-y-8">
                            <div className="space-y-3.5">
                                <label className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-tight px-1">PROJECT TITLE</label>
                                <div className="bg-[#EDF1F5] p-2.5 rounded-[1.75rem]">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="E.g. Q4 Executive Retreat"
                                        className="w-full bg-white rounded-[1.25rem] h-14 px-5 border border-gray-100 shadow-sm focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37]/30 outline-none text-secondary font-[800]"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                <label className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-tight px-1">COMMENCEMENT DATE</label>
                                <div className="bg-[#EDF1F5] p-2.5 rounded-[1.75rem]">
                                    <input
                                        type="date"
                                        className="w-full bg-white rounded-[1.25rem] h-14 px-5 border border-gray-100 shadow-sm focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37]/30 outline-none text-secondary font-[800] text-sm"
                                        value={newProjectDate}
                                        onChange={(e) => setNewProjectDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex items-center gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 bg-gray-100 text-gray-400 font-black py-4 rounded-3xl hover:text-secondary transition-colors text-[11px] uppercase tracking-tight"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim()}
                                className="flex-[1.5] bg-[#D4AF37] hover:bg-[#B09028] disabled:bg-gray-200 text-white font-[900] py-4 rounded-3xl shadow-fab transition-all active:scale-[0.98] uppercase tracking-tight text-[12px]"
                            >
                                CREATE PROJECT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
