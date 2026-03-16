import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const hasError = errors.email || errors.password;

    return (
        <div className="min-h-screen grid grid-cols-2">
            <Head title="Sign In" />

            {/* ── Left panel ── */}
            <div className="relative flex flex-col justify-between p-14 bg-gradient-to-br from-neutral-800 via-neutral-800 to-black overflow-hidden">
                {/* Subtle radial sheen */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-[0.03] rounded-full blur-3xl" />
                    <div className="absolute top-0 right-0 w-72 h-72 bg-white opacity-[0.02] rounded-full blur-3xl" />
                </div>

                {/* Watermark logo */}
                <div className="absolute -bottom-10 -right-10 w-80 h-80 opacity-[0.04] pointer-events-none select-none">
                    <img src="/logo.svg" alt="" className="w-full h-full object-contain brightness-200" />
                </div>

                {/* Brand */}
                <div className="relative z-10">
                    <img src="/logo.svg" alt="ASEC Logo" className="h-9 brightness-200 opacity-90" />
                </div>

                {/* Bottom copy */}
                <div className="relative z-10">
                    <p className="text-neutral-400 text-sm font-light tracking-widest uppercase mb-2">
                        Where Vision meets Precision
                    </p>
                    <h2 className="text-white font-black uppercase tracking-tight leading-none mb-6"
                        style={{ fontSize: '3.5rem', letterSpacing: '-0.01em' }}>
                        Admin<br />Portal
                    </h2>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-neutral-400 to-transparent mb-5" />
                    <p className="text-neutral-400 text-xs leading-relaxed font-light">
                        Restricted access — authorized personnel only.<br />
                        All sessions are monitored and recorded.
                    </p>
                </div>
            </div>

            {/* ── Right panel ── */}
            <div className="relative flex items-center justify-center p-14 bg-gradient-to-br from-neutral-200 via-neutral-300 to-neutral-400">
                {/* Top metallic edge */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-40" />

                <div className="w-full max-w-sm">
                    {/* Header */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-500">
                                Abdurauf Sawadjaan Engineering Consultancy
                            </span>
                        </div>
                        <div className="h-px bg-neutral-400 opacity-30 mb-4" />
                        <h1 className="text-5xl font-black uppercase tracking-tight text-neutral-900 leading-none">
                            Sign In
                        </h1>
                    </div>

                    {/* Status */}
                    {status && (
                        <div className="mb-6 px-4 py-3 text-xs text-green-800 bg-green-50 border border-green-200 rounded">
                            {status}
                        </div>
                    )}

                    {/* Error banner */}
                    {hasError && (
                        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 border-l-4 border-l-red-600 rounded animate-pulse-once">
                            <p className="text-xs text-red-700 font-medium tracking-wide">
                                {errors.email || errors.password}
                            </p>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-xs font-bold tracking-[0.18em] uppercase text-neutral-600 mb-2"
                            >
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                autoFocus
                                placeholder="you@company.com"
                                onChange={(e) => setData('email', e.target.value)}
                                className={`w-full px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 bg-white/60 backdrop-blur-sm border rounded transition-all outline-none
                                    focus:bg-white/90 focus:ring-2 focus:ring-neutral-800 focus:ring-offset-0
                                    ${hasError
                                        ? 'border-red-500 focus:ring-red-400'
                                        : 'border-neutral-400/40 focus:border-neutral-800'
                                    }`}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-bold tracking-[0.18em] uppercase text-neutral-600 mb-2"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`w-full px-4 py-3 pr-11 text-sm text-neutral-900 placeholder-neutral-400 bg-white/60 backdrop-blur-sm border rounded transition-all outline-none
                                        focus:bg-white/90 focus:ring-2 focus:ring-neutral-800 focus:ring-offset-0
                                        ${hasError
                                            ? 'border-red-500 focus:ring-red-400'
                                            : 'border-neutral-400/40 focus:border-neutral-800'
                                        }`}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full mt-2 py-3 px-6 bg-gradient-to-b from-neutral-800 to-neutral-950 text-white text-xs font-bold tracking-[0.22em] uppercase rounded shadow-lg
                                hover:from-neutral-700 hover:to-neutral-900 hover:-translate-y-0.5 hover:shadow-xl
                                active:translate-y-0 active:shadow-md
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                                transition-all duration-150"
                        >
                            {processing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-neutral-400/30">
                        <p className="text-xs text-neutral-500 font-light tracking-wide">
                            Need access? Contact your administrator.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}