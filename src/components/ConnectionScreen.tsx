import { useState } from 'react';
import { Monitor, ArrowRight, ShieldCheck, Copy, Check } from 'lucide-react';

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
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {/* Left Card: My Identity */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col justify-between h-full shadow-2xl">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Monitor className="h-6 w-6 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-100">This Workstation</h2>
                        </div>

                        <p className="text-gray-400 mb-8 leading-relaxed">
                            Share this ID with your partner to allow them to connect to your screen.
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                Your Peer ID
                            </label>
                            <div className="group relative">
                                <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-lg text-gray-200 break-all pr-12">
                                    {myId || 'Generating ID...'}
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                    title="Copy ID"
                                >
                                    {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                End-to-end encrypted connection
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Card: Connect to Partner */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 flex flex-col justify-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-2">Remote Control</h2>
                        <p className="text-blue-100 mb-8">
                            Enter your partner's ID to access their screen and transfer files.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-2 block">
                                    Partner ID
                                </label>
                                <input
                                    type="text"
                                    value={remoteId}
                                    onChange={(e) => setRemoteId(e.target.value)}
                                    placeholder="Paste ID here"
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-mono"
                                />
                            </div>

                            <button
                                onClick={() => onConnect(remoteId)}
                                disabled={!remoteId}
                                className="w-full bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl py-4 font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                            >
                                Connect Now
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-gray-500 text-sm font-medium">
                Ready to connect • v1.0.0
            </div>
        </div>
    );
}
