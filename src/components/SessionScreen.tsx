import { useRef, useEffect, useState, useCallback } from 'react';
import { PhoneOff, Mic, MonitorOff, FileUp, Maximize2, MousePointer2, ExternalLink, Upload, Volume2 } from 'lucide-react';
import { NewWindow } from './NewWindow';

interface SessionScreenProps {
    remoteStream: MediaStream | null;
    onDisconnect: () => void;
    onSendFile: (file: File) => void;
    onSendInput: (event: any) => void;
    connectionStatus: string;
}

export function SessionScreen({ remoteStream, onDisconnect, onSendFile, onSendInput, connectionStatus }: SessionScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showControls, setShowControls] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const [remoteControlEnabled, setRemoteControlEnabled] = useState(false);
    const [isPoppedOut, setIsPoppedOut] = useState(false);
    const lastMouseMoveTime = useRef<number>(0);
    const mouseMoveThrottle = 16; // ~60 updates per second for mouse movement

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    useEffect(() => {
        let timeout: any;
        if (!isHovering) {
            timeout = setTimeout(() => setShowControls(false), 3000);
        } else {
            setShowControls(true);
        }
        return () => clearTimeout(timeout);
    }, [isHovering]);

    // Focus container when remote control is enabled
    useEffect(() => {
        if (remoteControlEnabled && containerRef.current) {
            containerRef.current.focus();
        }
    }, [remoteControlEnabled]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSendFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            onSendFile(file);
        }
    };

    // Helper function to calculate video coordinates
    const getVideoCoordinates = useCallback((clientX: number, clientY: number) => {
        if (!videoRef.current) return null;

        const rect = videoRef.current.getBoundingClientRect();
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) return null;
        
        const videoAspect = videoWidth / videoHeight;
        const containerAspect = rect.width / rect.height;
        
        let displayedWidth: number;
        let displayedHeight: number;
        let offsetX = 0;
        let offsetY = 0;
        
        if (videoAspect > containerAspect) {
            displayedWidth = rect.width;
            displayedHeight = rect.width / videoAspect;
            offsetY = (rect.height - displayedHeight) / 2;
        } else {
            displayedHeight = rect.height;
            displayedWidth = rect.height * videoAspect;
            offsetX = (rect.width - displayedWidth) / 2;
        }
        
        const relativeX = clientX - rect.left - offsetX;
        const relativeY = clientY - rect.top - offsetY;
        
        const clampedX = Math.max(0, Math.min(relativeX, displayedWidth));
        const clampedY = Math.max(0, Math.min(relativeY, displayedHeight));
        
        const videoX = Math.round((clampedX / displayedWidth) * videoWidth);
        const videoY = Math.round((clampedY / displayedHeight) * videoHeight);
        
        return { x: videoX, y: videoY };
    }, []);

    // Input Capture Logic
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!remoteControlEnabled || !videoRef.current) return;

        const now = Date.now();
        if (now - lastMouseMoveTime.current < mouseMoveThrottle) {
            return;
        }
        lastMouseMoveTime.current = now;

        const coords = getVideoCoordinates(e.clientX, e.clientY);
        if (coords) {
            onSendInput({
                type: 'MouseMove',
                payload: { x: coords.x, y: coords.y }
            });
        }
    }, [remoteControlEnabled, getVideoCoordinates, onSendInput]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!remoteControlEnabled || !videoRef.current) return;
        
        const coords = getVideoCoordinates(e.clientX, e.clientY);
        if (!coords) return;
        
        const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
        onSendInput({
            type: 'MouseClick',
            payload: { button, x: coords.x, y: coords.y }
        });
    }, [remoteControlEnabled, getVideoCoordinates, onSendInput]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!remoteControlEnabled) return;
        
        // Prevent default for special keys
        if (['Tab', 'Escape', 'F5'].includes(e.key)) {
            e.preventDefault();
        }
        
        onSendInput({
            type: 'KeyPress',
            payload: { key: e.key }
        });
    }, [remoteControlEnabled, onSendInput]);

    useEffect(() => {
        if (remoteControlEnabled) {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [remoteControlEnabled, handleKeyDown]);

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div
            ref={containerRef}
            className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col relative overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onMouseMove={(e) => {
                setShowControls(true);
                setIsHovering(true);
                handleMouseMove(e);
            }}
            onMouseLeave={() => setIsHovering(false)}
            onMouseDown={handleMouseDown}
            onKeyDown={(e) => handleKeyDown(e as any)}
            tabIndex={remoteControlEnabled ? 0 : -1}
            onContextMenu={(e) => {
                if (remoteControlEnabled) {
                    e.preventDefault();
                }
            }}
        >
            {/* Main Video Area */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full overflow-hidden">
                {remoteStream ? (
                    isPoppedOut ? (
                        <NewWindow onClose={() => setIsPoppedOut(false)}>
                            <div
                                className="w-full h-full flex items-center justify-center bg-black"
                                onMouseMove={handleMouseMove}
                                onMouseDown={handleMouseDown}
                                onKeyDown={(e: any) => handleKeyDown(e)}
                                tabIndex={0}
                            >
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className={`max-w-[100vw] max-h-[100vh] w-full h-full object-contain ${remoteControlEnabled ? 'cursor-none' : ''}`}
                                    onContextMenu={(e) => {
                                        if (remoteControlEnabled) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                        </NewWindow>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={`max-w-full max-h-full w-full h-full object-contain ${remoteControlEnabled ? 'cursor-none' : ''}`}
                            onContextMenu={(e) => {
                                if (remoteControlEnabled) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    )
                ) : (
                    <div className="text-center space-y-8">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" />
                            <div className="relative bg-white/5 p-8 rounded-full border border-white/10 backdrop-blur-sm">
                                <MonitorOff className="h-16 w-16 text-indigo-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                {connectionStatus}
                            </h3>
                            <p className="text-gray-400 text-lg">Waiting for video stream...</p>
                        </div>
                    </div>
                )}

                {/* File Drop Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-indigo-500/20 opacity-0 transition-opacity duration-300 group-drag-over:opacity-100 backdrop-blur-sm">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-6 rounded-2xl shadow-2xl font-bold text-xl flex items-center gap-4 border border-white/20">
                        <Upload className="h-8 w-8" />
                        Drop to Send File
                    </div>
                </div>
            </div>

            {/* Modern Control Bar */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300 ease-out ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
                <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl flex items-center gap-3 px-4 py-3">

                    {/* Status Badge */}
                    <div className="px-4 py-2 flex items-center gap-2.5 bg-slate-800/50 rounded-xl border border-slate-700/30">
                        <div className={`w-2.5 h-2.5 rounded-full ${remoteStream ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]'}`} />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            {remoteStream ? 'Live' : 'Connecting'}
                        </span>
                    </div>

                    <div className="h-8 w-px bg-slate-700/50" />

                    {/* Control Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setRemoteControlEnabled(!remoteControlEnabled)}
                            className={`px-4 py-2.5 rounded-xl transition-all duration-200 group relative flex items-center gap-2 ${
                                remoteControlEnabled 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white border border-slate-700/30'
                            }`}
                            title="Remote Control"
                        >
                            <MousePointer2 className="h-4 w-4" />
                            <span className="text-xs font-semibold hidden sm:inline">Control</span>
                        </button>

                        <button 
                            className="px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all border border-slate-700/30 group relative"
                            title="Toggle Mic"
                        >
                            <Volume2 className="h-4 w-4" />
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all border border-slate-700/30 group relative"
                            title="Send File"
                        >
                            <FileUp className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => setIsPoppedOut(!isPoppedOut)}
                            className={`px-4 py-2.5 rounded-xl transition-all border ${
                                isPoppedOut 
                                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                                    : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white border-slate-700/30'
                            }`}
                            title={isPoppedOut ? 'Restore' : 'Pop Out'}
                        >
                            <ExternalLink className="h-4 w-4" />
                        </button>

                        <button 
                            onClick={handleFullscreen}
                            className="px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all border border-slate-700/30"
                            title="Fullscreen"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-700/50" />

                    {/* Disconnect Button */}
                    <button
                        onClick={onDisconnect}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold transition-all shadow-lg shadow-red-500/20 border border-red-500/30 flex items-center gap-2"
                        title="Disconnect"
                    >
                        <PhoneOff className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Disconnect</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
