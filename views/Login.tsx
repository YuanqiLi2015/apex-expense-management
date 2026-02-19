
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
    onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await signIn(email, password);
        if (error) {
            setError(error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#FBFBFE] max-w-md mx-auto">
            {/* Top gradient header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#d4af35] via-[#c9a732] to-[#b09028]" />
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-[-50%] right-[-30%] w-[80%] h-[200%] rounded-full bg-white/20 rotate-12" />
                    <div className="absolute bottom-[-40%] left-[-20%] w-[60%] h-[180%] rounded-full bg-white/10 -rotate-12" />
                </div>
                <div className="relative px-8 pt-16 pb-14 text-center">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-[1.5rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30">
                        <span className="material-symbols-outlined text-white text-[36px] fill-1">diamond</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Apex Expense</h1>
                    <p className="text-white/70 text-sm font-medium mt-2">Premium Expense Management</p>
                </div>
                {/* Curved bottom edge */}
                <div className="absolute -bottom-1 left-0 right-0">
                    <svg viewBox="0 0 400 30" preserveAspectRatio="none" className="w-full h-[30px]">
                        <path d="M0,30 L0,0 C100,25 300,25 400,0 L400,30 Z" fill="#FBFBFE" />
                    </svg>
                </div>
            </div>

            {/* Login Form */}
            <div className="flex-1 px-8 pt-4 pb-8">
                <h2 className="text-2xl font-black text-secondary tracking-tight mb-1">Welcome Back</h2>
                <p className="text-gray-400 text-sm font-medium mb-8">Sign in to continue</p>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100">
                        <p className="text-red-600 text-sm font-semibold text-center">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
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
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af35] to-[#c9a732] text-white font-black text-[15px] tracking-wide shadow-fab hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Signing in...</span>
                            </div>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm font-medium">
                        Don't have an account?{' '}
                        <button
                            onClick={onSwitchToRegister}
                            className="text-[#d4af35] font-black hover:underline transition-colors"
                        >
                            Create Account
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
