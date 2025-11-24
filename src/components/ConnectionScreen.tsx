import { useState } from 'react';
import { Monitor, ArrowRight, ShieldCheck, Copy, Check, Zap, Users, Lock } from 'lucide-react';

interface ConnectionScreenProps {
    myId: string;
    onConnect: (id: string) => void;
}

export function ConnectionScreen({ myId, onConnect }: ConnectionScreenProps) {
    const [remoteId, setRemoteId] = useState('');
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(myId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-6xl w-full relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                            <Zap className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Remote Control
                        </h1>
                    </div>
                    <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                        Secure, fast, and reliable remote desktop access. Connect instantly with end-to-end encryption.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Share Screen Card */}
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl hover:border-indigo-500/50 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <Monitor className="h-6 w-6 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Share Your Screen</h2>
                                <p className="text-sm text-slate-400 mt-1">Let others connect to you</p>
                            </div>
                        </div>

                        <p className="text-slate-300 mb-8 leading-relaxed text-[15px]">
                            Share this unique ID with your partner. They can use it to securely connect and view your screen in real-time.
                        </p>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                                Your Connection ID
                            </label>
                            <div className="relative group">
                                <div className="bg-slate-950/80 border border-slate-700/50 rounded-xl p-5 font-mono text-base text-slate-200 break-all pr-16 min-h-[70px] flex items-center backdrop-blur-sm">
                                    {myId || (
                                        <span className="text-slate-500 animate-pulse">Generating secure ID...</span>
                                    )}
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 hover:bg-slate-800/50 rounded-lg transition-all text-slate-400 hover:text-white active:scale-95 border border-slate-700/30"
                                    title="Copy ID"
                                >
                                    {copied ? (
                                        <Check className="h-5 w-5 text-emerald-400" />
                                    ) : (
                                        <Copy className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                                <p className="text-xs text-slate-500">
                                    End-to-end encrypted • Secure connection
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Connect Card */}
                    <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl border border-indigo-400/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3.5 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                                    <Users className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Connect Remotely</h2>
                                    <p className="text-sm text-indigo-100 mt-1">Access another screen</p>
                                </div>
                            </div>

                            <p className="text-indigo-50 mb-8 leading-relaxed text-[15px]">
                                Enter your partner's connection ID to access their screen, transfer files, and control their desktop remotely.
                            </p>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-3 block">
                                        Partner Connection ID
                                    </label>
                                    <input
                                        type="text"
                                        value={remoteId}
                                        onChange={(e) => setRemoteId(e.target.value)}
                                        placeholder="Enter or paste connection ID"
                                        className="w-full bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-5 py-4 text-white placeholder:text-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all font-mono text-[15px]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && remoteId) {
                                                onConnect(remoteId);
                                            }
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={() => onConnect(remoteId)}
                                    disabled={!remoteId}
                                    className="w-full bg-white text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl py-4 font-bold text-base shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
                                >
                                    <span>Connect Now</span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/30 rounded-xl p-5 text-center">
                        <ShieldCheck className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                        <h3 className="font-semibold text-white mb-1">Secure</h3>
                        <p className="text-xs text-slate-400">End-to-end encryption</p>
                    </div>
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/30 rounded-xl p-5 text-center">
                        <Zap className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
                        <h3 className="font-semibold text-white mb-1">Fast</h3>
                        <p className="text-xs text-slate-400">Low latency streaming</p>
                    </div>
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/30 rounded-xl p-5 text-center">
                        <Users className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                        <h3 className="font-semibold text-white mb-1">Simple</h3>
                        <p className="text-xs text-slate-400">Easy to use</p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 text-sm font-medium">
                Ready to connect • v1.0.0
            </div>
        </div>
    );
}
