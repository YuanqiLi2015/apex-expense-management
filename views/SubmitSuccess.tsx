
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SubmitSummary {
    projectName: string;
    projectId: string;
    expenseCount: number;
    totalAmount: number;
    attachmentCount?: number;
    sentTo: string;
}

const SubmitSuccess: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const summary = (location.state as { summary?: SubmitSummary })?.summary;
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 300);
        return () => clearTimeout(timer);
    }, []);

    if (!summary) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#FBFBFE]">
                <div className="text-center px-6">
                    <p className="text-gray-400 font-bold">No submission data found</p>
                    <button onClick={() => navigate('/projects')} className="mt-4 text-[#D4AF37] font-black text-sm uppercase">
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FBFBFE] px-6">
            {/* Animated Success Icon */}
            <div className={`transition-all duration-700 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                <div className="relative mb-6">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-[0_8px_40px_rgba(34,197,94,0.3)]">
                        <span className="material-symbols-outlined text-white text-[56px] fill-1">check_circle</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-[20px] fill-1">mail</span>
                    </div>
                </div>
            </div>

            {/* Success Message */}
            <div className={`text-center transition-all duration-700 delay-200 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <h1 className="text-3xl font-black text-secondary tracking-tight mb-3">Submitted!</h1>
                <p className="text-gray-400 text-sm font-medium max-w-[280px] leading-relaxed">
                    Expense report has been sent to the secretary
                </p>
            </div>

            {/* Summary Card */}
            <div className={`w-full max-w-sm mt-6 transition-all duration-700 delay-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <div className="bg-white rounded-[2.25rem] p-8 shadow-card border border-gray-100">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-black text-secondary tracking-tight">{summary.projectName}</h2>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t border-gray-50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Expenses</span>
                        <span className="text-sm font-black text-secondary">{summary.expenseCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-t border-gray-50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Total Amount</span>
                        <span className="text-lg font-black text-[#D4AF37]">¥{summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {summary.attachmentCount !== undefined && summary.attachmentCount > 0 && (
                        <div className="flex justify-between items-center py-4 border-t border-gray-50">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Attachments</span>
                            <span className="text-sm font-black text-secondary">{summary.attachmentCount}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center py-4 border-t border-gray-50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Sent To</span>
                        <span className="text-sm font-black text-secondary truncate max-w-[150px]">{summary.sentTo}</span>
                    </div>
                </div>
            </div>

            {/* Back to Projects Button */}
            <div className={`w-full max-w-sm mt-6 transition-all duration-700 delay-700 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <button
                    onClick={() => navigate('/projects')}
                    className="w-full py-4 rounded-full bg-[#D4AF37] text-white font-black text-sm uppercase tracking-tight shadow-fab hover:bg-[#c4a130] transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px] fill-1">arrow_back</span>
                    Back to Projects
                </button>
            </div>
        </div>
    );
};

export default SubmitSuccess;
