
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface RegisterProps {
    onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
    const { signUp } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        const { error } = await signUp(email, password, fullName);
        if (error) {
            setError(error);
        } else {
            setSuccess(true);
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFE] max-w-md mx-auto px-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#d4af35] to-[#c9a732] flex items-center justify-center mb-6 shadow-fab">
                    <span className="material-symbols-outlined text-white text-[42px] fill-1">check_circle</span>
                </div>
                <h2 className="text-2xl font-black text-secondary tracking-tight mb-2">Account Created!</h2>
                <p className="text-gray-400 text-sm font-medium text-center mb-8 leading-relaxed">
                    Please check your email to verify your account, then sign in.
                </p>
                <button
                    onClick={onSwitchToLogin}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af35] to-[#c9a732] text-white font-black text-[15px] tracking-wide shadow-fab hover:shadow-lg active:scale-[0.98] transition-all"
                >
                    Back to Sign In
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#FBFBFE] max-w-md mx-auto">
            {/* Top gradient header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#d4af35] via-[#c9a732] to-[#b09028]" />
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-[-50%] right-[-30%] w-[80%] h-[200%] rounded-full bg-white/20 rotate-12" />
                    <div className="absolute bottom-[-40%] left-[-20%] w-[60%] h-[180%] rounded-full bg-white/10 -rotate-12" />
                </div>
                <div className="relative px-8 pt-14 pb-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-[1.25rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30">
                        <span className="material-symbols-outlined text-white text-[30px] fill-1">person_add</span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Create Account</h1>
                    <p className="text-white/70 text-sm font-medium mt-1">Join Apex Expense Management</p>
                </div>
                <div className="absolute -bottom-1 left-0 right-0">
                    <svg viewBox="0 0 400 30" preserveAspectRatio="none" className="w-full h-[30px]">
                        <path d="M0,30 L0,0 C100,25 300,25 400,0 L400,30 Z" fill="#FBFBFE" />
                    </svg>
                </div>
            </div>

            {/* Register Form */}
            <div className="flex-1 px-8 pt-2 pb-8">
                {error && (
                    <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100">
                        <p className="text-red-600 text-sm font-semibold text-center">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 px-1">
                            Full Name
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-300 text-[20px]">person</span>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 text-secondary font-semibold text-[15px] placeholder:text-gray-300 focus:outline-none focus:border-[#d4af35] focus:ring-2 focus:ring-[#d4af35]/10 transition-all shadow-card"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 px-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-300 text-[20px]">mail</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 text-secondary font-semibold text-[15px] placeholder:text-gray-300 focus:outline-none focus:border-[#d4af35] focus:ring-2 focus:ring-[#d4af35]/10 transition-all shadow-card"
                                placeholder="your@email.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 px-1">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-300 text-[20px]">lock</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-gray-100 text-secondary font-semibold text-[15px] placeholder:text-gray-300 focus:outline-none focus:border-[#d4af35] focus:ring-2 focus:ring-[#d4af35]/10 transition-all shadow-card"
                                placeholder="Min. 6 characters"
                                required
                                autoComplete="new-password"
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 px-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-300 text-[20px]">lock</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 text-secondary font-semibold text-[15px] placeholder:text-gray-300 focus:outline-none focus:border-[#d4af35] focus:ring-2 focus:ring-[#d4af35]/10 transition-all shadow-card"
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af35] to-[#c9a732] text-white font-black text-[15px] tracking-wide shadow-fab hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Creating account...</span>
                            </div>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm font-medium">
                        Already have an account?{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-[#d4af35] font-black hover:underline transition-colors"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
