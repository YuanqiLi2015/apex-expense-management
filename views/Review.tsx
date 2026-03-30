
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Expense, TransactionStatus, Attachment } from '../types';

interface LocationState {
    expense?: Expense;
    scannedImage?: string;
    ocrData?: {
        merchant: string;
        amount: number;
        category: string;
        date: string;
        icon: string;
    };
}

const Review: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { projects, expenses, updateExpense, addExpense, deleteExpense } = useAppContext();
    const state = location.state as LocationState;

    const isExistingExpense = !!state?.expense;

    const handleDeleteExpense = () => {
        if (state?.expense && window.confirm('Delete this expense? This cannot be undone.')) {
            deleteExpense(state.expense.id);
            navigate(-1);
        }
    };

    const projectDropdownRef = useRef<HTMLDivElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [expenseData, setExpenseData] = useState<Expense>(() => {
        if (state?.expense) return state.expense;

        return {
            id: 'NEW',
            merchant: state?.ocrData?.merchant || "",
            expenseName: "",
            date: state?.ocrData?.date || new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            amount: state?.ocrData?.amount || 0,
            category: state?.ocrData?.category || "General",
            icon: state?.ocrData?.icon || "receipt",
            status: TransactionStatus.PENDING,
            projectId: null,
            attachments: []
        };
    });

    const [attachments, setAttachments] = useState<Attachment[]>(() => {
        return state?.expense?.attachments || [];
    });

    useEffect(() => {
        if (state?.scannedImage) {
            const scannedAtt: Attachment = {
                id: 'scanned-receipt-' + Date.now(),
                url: state.scannedImage,
                type: 'image/jpeg',
                name: 'Captured Receipt.jpg'
            };
            setAttachments(prev => {
                if (prev.some(a => a.url === state.scannedImage)) return prev;
                return [scannedAtt, ...prev];
            });
        }
    }, [state?.scannedImage]);

    const [amountInput, setAmountInput] = useState<string>(
        expenseData.amount === 0 ? "" : expenseData.amount.toString()
    );

    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {
            'Travel': 'flight',
            'Hotel': 'hotel',
            'Meals': 'restaurant',
            'Transport': 'local_taxi',
            'Equipment': 'laptop_mac',
            'Subscription': 'branding_watermark',
            'Cloud': 'cloud',
            'General': 'receipt',
            'Other': 'more_horiz'
        };
        expenses.forEach(e => {
            if (!map[e.category]) {
                map[e.category] = e.icon;
            }
        });
        return map;
    }, [expenses]);

    const existingCategories = useMemo(() => {
        return Object.keys(categoryMap).sort();
    }, [categoryMap]);

    const selectedProject = projects.find(p => p.id === expenseData.projectId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
                setIsProjectDropdownOpen(false);
            }
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9.]/g, '');
        if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
            val = val.substring(1);
        }
        const parts = val.split('.');
        if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');

        setAmountInput(val);
        const numericValue = parseFloat(val) || 0;
        setExpenseData(prev => ({ ...prev, amount: numericValue }));
    };

    const formattedAmountDisplay = useMemo(() => {
        if (!amountInput) return "";
        if (amountInput === '.') return ".";
        const parts = amountInput.split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
    }, [amountInput]);

    const handleSelectProject = (projectId: string) => {
        setExpenseData(prev => ({ ...prev, projectId }));
        setIsProjectDropdownOpen(false);
    };

    const handleSelectCategory = (category: string) => {
        const icon = categoryMap[category] || 'receipt';
        setExpenseData(prev => ({ ...prev, category, icon }));
        setIsCategoryDropdownOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                const newAttachment: Attachment = {
                    id: crypto.randomUUID(),
                    url: base64,
                    type: file.type,
                    name: file.name
                };
                setAttachments(prev => [...prev, newAttachment]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(att => att.id !== id));
    };

    const handleSave = () => {
        const finalData = {
            merchant: expenseData.merchant,
            expenseName: expenseData.merchant,
            amount: expenseData.amount,
            category: expenseData.category,
            icon: expenseData.icon,
            projectId: expenseData.projectId,
            date: expenseData.date,
            time: expenseData.time,
            status: expenseData.status,
            attachments: attachments
        };

        if (expenseData.id === 'NEW') {
            addExpense(finalData);
        } else {
            updateExpense(expenseData.id, finalData);
        }

        navigate('/expenses');
    };

    const fieldContainerClass = "bg-[#EDF1F5] p-3 rounded-[2.5rem] w-full shadow-[0_4px_15px_rgba(237,241,245,0.4)]";
    const innerInputClass = "w-full bg-white rounded-[1.75rem] h-14 px-5 border-none focus:ring-0 text-secondary font-black text-lg shadow-sm";

    return (
        <>
        <div className="flex-1 flex flex-col bg-white relative min-h-screen font-display">
            <header className="sticky top-0 z-[110] bg-white/95 backdrop-blur-md border-b border-gray-100/50 pt-12 pb-4">
                <div className="max-w-screen-xl mx-auto px-6">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-between w-full h-10 mb-2">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center justify-center text-[#d4af35] active:scale-90 transition-transform"
                            >
                                <span className="material-symbols-outlined text-2xl font-black">chevron_left</span>
                            </button>
                            <h2 className="text-[15px] font-black tracking-tighter text-[#d4af35] uppercase">Expense Details</h2>
                            <div className="w-10"></div>
                        </div>
                    </div>
                </div>
            </header>

            <main ref={mainContentRef} className="flex-1 overflow-y-auto hide-scrollbar pb-80 max-w-screen-xl mx-auto w-full">
                <div className="mt-8 px-6 text-center">
                    <div className="flex items-baseline justify-center gap-1.5 relative">
                        <span className="text-3xl font-[900] text-slate-300 tracking-tighter">¥</span>
                        <div className="relative inline-block">
                            <input
                                className="text-6xl font-[900] bg-transparent border-none text-left p-0 focus:ring-0 text-secondary placeholder-gray-200 tracking-tighter"
                                style={{ width: amountInput ? `${Math.max(formattedAmountDisplay.length, 1) * 0.65}em` : '2.5em' }}
                                type="text"
                                inputMode="decimal"
                                value={formattedAmountDisplay}
                                onChange={handleAmountChange}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="w-[140px] h-[3px] bg-slate-50 mx-auto mt-6 rounded-full shadow-inner"></div>
                </div>

                <div className="mt-12 px-6 flex flex-col gap-8">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-[#d4af35] uppercase tracking-tighter px-2">MERCHANT / VENDOR</label>
                        <div className={fieldContainerClass}>
                            <input
                                className={innerInputClass}
                                type="text"
                                placeholder="Where was this spent?"
                                value={expenseData.merchant}
                                onChange={(e) => setExpenseData({ ...expenseData, merchant: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                            <label className="block text-[10px] font-black text-[#d4af35] uppercase tracking-tighter px-2">DATE</label>
                            <div className={fieldContainerClass}>
                                <div className="bg-white rounded-[1.75rem] h-14 flex items-center px-4 shadow-sm">
                                    <input
                                        className="w-full bg-transparent border-none focus:ring-0 text-secondary font-black text-[14px] appearance-none p-0 text-center tracking-tighter"
                                        type="date"
                                        value={expenseData.date}
                                        onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 relative" ref={categoryDropdownRef}>
                            <label className="block text-[10px] font-black text-[#d4af35] uppercase tracking-tighter px-2">CATEGORY</label>
                            <div className={fieldContainerClass}>
                                <button
                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    className="w-full bg-white rounded-[1.75rem] h-14 flex items-center justify-between px-4 group shadow-sm active:scale-95 transition-transform"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="material-symbols-outlined text-[20px] text-[#d4af35] fill-1">{expenseData.icon}</span>
                                        <span className="truncate text-secondary text-[13px] font-black tracking-tighter">{expenseData.category}</span>
                                    </div>
                                    <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                            </div>

                            {isCategoryDropdownOpen && (
                                <div className="absolute top-full left-0 w-full mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="max-h-[250px] overflow-y-auto hide-scrollbar p-1">
                                        {existingCategories.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => handleSelectCategory(cat)}
                                                className="w-full text-left px-5 py-4 text-[13px] font-black flex items-center gap-3 hover:bg-[#D4AF37]/5 hover:text-[#D4AF37] transition-all rounded-[1.5rem] mb-1 last:mb-0"
                                            >
                                                <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-[#D4AF37]">{categoryMap[cat]}</span>
                                                <span className="tracking-tight">{cat}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative space-y-3" ref={projectDropdownRef}>
                        <label className="block text-[10px] font-black text-[#d4af35] uppercase tracking-tighter px-2">PROJECT ASSIGNMENT</label>
                        <div className={fieldContainerClass}>
                            <button
                                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                className="w-full bg-white rounded-[1.75rem] h-14 flex items-center justify-between px-5 group shadow-sm active:scale-95 transition-transform"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className={`material-symbols-outlined text-[22px] ${selectedProject ? 'text-[#d4af35] fill-1' : 'text-slate-300'}`}>
                                        folder_open
                                    </span>
                                    <span className={`truncate text-[13px] font-black tracking-tight ${selectedProject ? 'text-secondary' : 'text-slate-400'}`}>
                                        {selectedProject?.name || "Select target project..."}
                                    </span>
                                </div>
                                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isProjectDropdownOpen ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>
                        </div>

                        {isProjectDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="max-h-[300px] overflow-y-auto hide-scrollbar p-1">
                                    {projects.filter(p => p.status === 'unsubmitted').map((proj) => (
                                        <button
                                            key={proj.id}
                                            onClick={() => handleSelectProject(proj.id)}
                                            className="w-full text-left px-6 py-6 text-[13px] font-black border-b border-slate-50 last:border-none flex items-center justify-between hover:bg-[#D4AF37]/5 transition-all rounded-[1.5rem]"
                                        >
                                            <span className="truncate text-secondary tracking-tight">{proj.name}</span>
                                            {expenseData.projectId === proj.id && <span className="material-symbols-outlined text-[#d4af35] fill-1 text-[20px]">check_circle</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 pt-2">
                        <label className="block text-[10px] font-black text-[#d4af35] uppercase tracking-tighter px-2">ATTACHMENTS</label>
                        <div className="grid grid-cols-3 gap-5">
                            {attachments.map((att) => {
                                const isPdf = att.type === 'application/pdf' || att.name?.toLowerCase().endsWith('.pdf');
                                return (
                                    <div
                                        key={att.id}
                                        className="relative aspect-square rounded-[2rem] overflow-hidden bg-white p-1.5 shadow-md border border-slate-100 cursor-pointer group/att hover:shadow-lg hover:border-[#D4AF37]/30 transition-all active:scale-[0.97]"
                                        onClick={() => setPreviewAttachment(att)}
                                    >
                                        {isPdf ? (
                                            <div className="w-full h-full rounded-[1.75rem] bg-red-50 flex flex-col items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-red-400 text-[36px]">picture_as_pdf</span>
                                                <span className="text-[9px] font-black text-red-400 uppercase tracking-tight text-center px-2 truncate max-w-full">{att.name || 'PDF'}</span>
                                            </div>
                                        ) : (
                                            <img src={att.url} alt={att.name} className="w-full h-full object-cover rounded-[1.75rem]" />
                                        )}
                                        <div className="absolute inset-1.5 rounded-[1.75rem] bg-black/0 group-hover/att:bg-black/5 transition-colors flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-[28px] opacity-0 group-hover/att:opacity-80 transition-opacity drop-shadow-lg">visibility</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }} className="absolute top-3 right-3 bg-red-500 text-white size-7 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform z-10">
                                            <span className="material-symbols-outlined text-[16px] font-black">close</span>
                                        </button>
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-[2rem] border-4 border-dashed border-slate-100 bg-[#FBFBFE] flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-[#d4af35] hover:border-[#d4af35]/30 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[40px]">add_a_photo</span>
                                <span className="text-[10px] font-black uppercase tracking-tighter">ADD FILE</span>
                            </button>
                        </div>
                        <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-2xl bg-white p-6 pb-12 z-[130] shadow-[0_-20px_60px_rgba(255,255,255,1)]">
                <div className="max-w-screen-xl mx-auto">
                    <button
                        onClick={handleSave}
                        className="w-full bg-[#D4AF37] hover:bg-[#B09028] text-white font-black py-6 rounded-full shadow-fab transition-all active:scale-[0.98] flex items-center justify-center gap-4 group"
                    >
                        <span className="material-symbols-outlined fill-1 text-[26px] group-hover:rotate-12 transition-transform">verified</span>
                        <span className="uppercase tracking-tighter text-[15px]">CONFIRM AND SAVE</span>
                    </button>
                    {isExistingExpense && (
                        <button
                            onClick={handleDeleteExpense}
                            className="w-full mt-3 py-3 rounded-full border border-red-200 text-red-400 font-black text-xs uppercase tracking-tight hover:bg-red-50 transition-colors active:scale-[0.97] flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Delete Expense
                        </button>
                    )}
                </div>
            </div>
        </div>

            {previewAttachment && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewAttachment(null)}
                >
                    <div
                        className="relative max-w-[92vw] max-h-[85vh] animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setPreviewAttachment(null)}
                            className="absolute -top-4 -right-4 z-10 bg-white text-secondary size-10 rounded-full flex items-center justify-center shadow-executive active:scale-90 transition-transform border border-gray-100"
                        >
                            <span className="material-symbols-outlined text-[22px] font-black">close</span>
                        </button>
                        {(previewAttachment.type === 'application/pdf' || previewAttachment.name?.toLowerCase().endsWith('.pdf')) ? (
                            <div className="bg-white rounded-[2.5rem] p-6 shadow-executive border border-gray-100 flex flex-col items-center gap-6 min-w-[280px]">
                                <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-400 text-[48px]">picture_as_pdf</span>
                                </div>
                                <p className="text-[14px] font-black text-secondary tracking-tight text-center max-w-[250px] truncate">{previewAttachment.name || 'PDF Document'}</p>
                                <a
                                    href={previewAttachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[#D4AF37] hover:bg-[#B09028] text-white font-black py-3.5 px-8 rounded-full shadow-fab transition-all active:scale-[0.98] uppercase tracking-tight text-[11px] flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                    Open PDF
                                </a>
                            </div>
                        ) : (
                            <img
                                src={previewAttachment.url}
                                alt={previewAttachment.name}
                                className="max-w-[92vw] max-h-[85vh] object-contain rounded-[2rem] shadow-executive"
                            />
                        )}
                        <p className="text-center mt-4 text-white/70 text-[11px] font-black uppercase tracking-tight truncate max-w-[250px] mx-auto">{previewAttachment.name}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default Review;
