import { useRef, useEffect, useState } from 'react';
import { PhoneOff, Mic, MonitorOff, FileUp, Maximize2, MousePointer2, GripHorizontal, ExternalLink } from 'lucide-react';
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

    // Input Capture Logic
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!remoteControlEnabled || !videoRef.current) return;

        // Throttle mouse move events to reduce network traffic
        const now = Date.now();
        if (now - lastMouseMoveTime.current < mouseMoveThrottle) {
            return;
        }
        lastMouseMoveTime.current = now;

        const rect = videoRef.current.getBoundingClientRect();
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        // Get actual displayed video dimensions (accounting for object-contain)
        const videoAspect = videoWidth / videoHeight;
        const containerAspect = rect.width / rect.height;
        
        let displayedWidth: number;
        let displayedHeight: number;
        let offsetX = 0;
        let offsetY = 0;
        
        if (videoAspect > containerAspect) {
            // Video is wider - fit to width
            displayedWidth = rect.width;
            displayedHeight = rect.width / videoAspect;
            offsetY = (rect.height - displayedHeight) / 2;
        } else {
            // Video is taller - fit to height
            displayedHeight = rect.height;
            displayedWidth = rect.height * videoAspect;
            offsetX = (rect.width - displayedWidth) / 2;
        }
        
        // Calculate relative position within the displayed video area
        const relativeX = e.clientX - rect.left - offsetX;
        const relativeY = e.clientY - rect.top - offsetY;
        
        // Clamp to displayed video bounds
        const clampedX = Math.max(0, Math.min(relativeX, displayedWidth));
        const clampedY = Math.max(0, Math.min(relativeY, displayedHeight));
        
        // Map to actual video coordinates
        const videoX = Math.round((clampedX / displayedWidth) * videoWidth);
        const videoY = Math.round((clampedY / displayedHeight) * videoHeight);

        onSendInput({
            type: 'MouseMove',
            payload: { x: videoX, y: videoY }
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!remoteControlEnabled || !videoRef.current) return;
        
        // Calculate coordinates the same way as handleMouseMove
        const rect = videoRef.current.getBoundingClientRect();
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
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
        
        const relativeX = e.clientX - rect.left - offsetX;
        const relativeY = e.clientY - rect.top - offsetY;
        
        const clampedX = Math.max(0, Math.min(relativeX, displayedWidth));
        const clampedY = Math.max(0, Math.min(relativeY, displayedHeight));
        
        const videoX = Math.round((clampedX / displayedWidth) * videoWidth);
        const videoY = Math.round((clampedY / displayedHeight) * videoHeight);
        
        const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
        onSendInput({
            type: 'MouseClick',
            payload: { button, x: videoX, y: videoY }
        });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!remoteControlEnabled) return;
        onSendInput({
            type: 'KeyPress',
            payload: { key: e.key }
        });
    };

    useEffect(() => {
        if (remoteControlEnabled) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [remoteControlEnabled]);


    return (
        <div
            className="h-screen bg-[#000000] flex flex-col relative overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onMouseMove={(e) => {
                setShowControls(true);
                setIsHovering(true);
                handleMouseMove(e);
            }}
            onMouseLeave={() => setIsHovering(false)}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => {
                // Prevent context menu when remote control is enabled
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
                                onMouseMove={(e) => {
                                    // Forward mouse events from popup to handler if needed, 
                                    // but for now we rely on the video ref being attached to the DOM in the popup
                                    // Note: React events bubble through portals, so handleMouseMove should still work!
                                    handleMouseMove(e);
                                }}
                                onMouseDown={handleMouseDown}
                                onKeyDown={(e: any) => handleKeyDown(e)}
                                tabIndex={0} // Make focusable for key events
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
                            className={`max-w-full max-h-full w-full h-full object-contain shadow-2xl ${remoteControlEnabled ? 'cursor-none' : ''}`}
                            onContextMenu={(e) => {
                                if (remoteControlEnabled) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    )
                ) : (
                    <div className="text-center space-y-6 animate-fade-in">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative bg-white/5 p-6 rounded-full border border-white/10">
                                <MonitorOff className="h-12 w-12 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-semibold text-white mb-2">{connectionStatus}</h3>
                            <p className="text-gray-400">Waiting for video stream...</p>
                        </div>
                    </div>
                )}

                {/* File Drop Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-blue-500/10 opacity-0 transition-opacity duration-300 group-drag-over:opacity-100">
                    <div className="bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-xl flex items-center gap-3">
                        <FileUp className="h-8 w-8" />
                        Drop to Send File
                    </div>
                </div>
            </div>

            {/* Floating Control Bar */}
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-500 ease-out ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-black/50 flex items-center gap-0 px-1 py-1.5">

                    {/* Status Indicator */}
                    <div className="px-5 py-2.5 flex items-center gap-2.5 border-r border-white/10">
                        <div className={`w-2.5 h-2.5 rounded-full ${remoteStream ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 animate-pulse'}`} />
                        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            {remoteStream ? 'Live' : 'Connecting'}
                        </span>
                    </div>

                    {/* Controls Group */}
                    <div className="flex items-center gap-1.5 px-2">
                        <button
                            onClick={() => setRemoteControlEnabled(!remoteControlEnabled)}
                            className={`p-3 rounded-xl transition-all duration-200 group relative ${remoteControlEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                            title="Remote Control"
                        >
                            <MousePointer2 className="h-5 w-5" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                                Remote Control
                            </span>
                        </button>

                        <button 
                            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white group relative"
                            title="Toggle Mic"
                        >
                            <Mic className="h-5 w-5" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                                Toggle Mic
                            </span>
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white group relative"
                            title="Send File"
                        >
                            <FileUp className="h-5 w-5" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                                Send File
                            </span>
                        </button>

                        <button
                            onClick={() => setIsPoppedOut(!isPoppedOut)}
                            className={`p-3 hover:bg-white/10 rounded-xl transition-colors group relative ${isPoppedOut ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white'}`}
                            title={isPoppedOut ? 'Restore' : 'Pop Out'}
                        >
                            <ExternalLink className="h-5 w-5" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                                {isPoppedOut ? 'Restore' : 'Pop Out'}
                            </span>
                        </button>

                        <button 
                            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white group relative"
                            title="Fullscreen"
                        >
                            <Maximize2 className="h-5 w-5" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                                Fullscreen
                            </span>
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="h-8 w-px bg-white/10 mx-1" />

                    {/* End Call */}
                    <div className="px-2">
                        <button
                            onClick={onDisconnect}
                            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/20 group relative"
                            title="Disconnect"
                        >
                            <PhoneOff className="h-5 w-5" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                                Disconnect
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
