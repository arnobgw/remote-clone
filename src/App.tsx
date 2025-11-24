import { useState, useEffect, useRef } from "react";
import { invoke } from '@tauri-apps/api/core';
import Peer from "peerjs";
import { ConnectionScreen } from "./components/ConnectionScreen";
import { SessionScreen } from "./components/SessionScreen";
import "./App.css";

// Simple toast notification (could be a component)
const showToast = (msg: string) => alert(msg); // Placeholder

function App() {
  const [myId, setMyId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("Initializing...");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showMonitorSelect, setShowMonitorSelect] = useState(false);
  const [monitors, setMonitors] = useState<any[]>([]);

  // Check if running in Tauri desktop app
  const isTauriApp = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

  // Canvas for native screen capture
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitorDimensionsRef = useRef<{ width: number, height: number } | null>(null);

  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const dataConnRef = useRef<any>(null);

  // File transfer state
  const incomingFileRef = useRef<{ meta: any; chunks: ArrayBuffer[] } | null>(null);

  // Initialize canvas for screen capture
  useEffect(() => {
    if (isTauriApp) {
      const canvas = document.createElement('canvas');
      canvas.width = 1920; // Will be updated based on actual monitor
      canvas.height = 1080;
      canvasRef.current = canvas;
    }
  }, [isTauriApp]);

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", (id: any) => {
      setMyId(id);
      setConnectionStatus("Ready to connect");
    });

    peer.on("call", (call: any) => {
      console.log("Receiving call from:", call.peer);
      setIncomingCall(call);
      setConnectionStatus("Incoming call...");
    });

    peer.on("connection", (conn: any) => {
      setupDataConnection(conn);
    });

    peer.on("error", (err: any) => {
      console.error(err);
      setConnectionStatus(`Error: ${err.type}`);
    });

    return () => {
      peer.destroy();
    };
  }, []);

  const setupDataConnection = (conn: any) => {
    console.log('[DATA] Setting up data connection');
    dataConnRef.current = conn;

    conn.on("open", () => {
      console.log('[DATA] Data connection open ✓');
    });

    conn.on("data", async (data: any) => {
      console.log('[DATA] Received data:', data);
      // Handle different data types
      // PeerJS might send data as ArrayBuffer or string/object depending on serialization
      // For simplicity, let's assume objects are sent as JSON if not binary

      if (data && data.type === 'input-event') {
        console.log('[INPUT] Received input event, invoking simulate_input');
        // Handle remote input event
        try {
          // Only works in Tauri mode, but we'll try anyway
          await invoke('simulate_input', { event: data.payload });
          console.log('[INPUT] simulate_input completed');
        } catch (e) {
          // Silently fail in browser mode - this is expected
          console.warn('[INPUT] Input simulation not available (browser mode)');
        }
        return;
      }

      if (data && data.type === 'file-meta') {
        incomingFileRef.current = { meta: data, chunks: [] };
        console.log(`Receiving file: ${data.name}`);
        showToast(`Receiving file: ${data.name}`);
      } else if (data && data.type === 'file-chunk') {
        incomingFileRef.current?.chunks.push(data.data);
      } else if (data && data.type === 'file-end') {
        if (incomingFileRef.current) {
          const blob = new Blob(incomingFileRef.current.chunks, { type: incomingFileRef.current.meta.mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = incomingFileRef.current.meta.name;
          a.click();
          URL.revokeObjectURL(url);
          incomingFileRef.current = null;
          alert('File received!');
        }
      }
    });

    conn.on("close", () => {
      console.log('[DATA] Data connection closed');
    });
  };

  // Helper to create a dummy stream (black screen)
  // This is needed because PeerJS requires a stream to initiate a call,
  // but we (the client) don't want to share our screen.
  const createDummyStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const stream = canvas.captureStream(30); // 30 FPS
    // Add a dummy audio track if needed, but for now just video
    return stream;
  };

  const connectToPeer = async (targetId: string) => {
    console.log('[CONNECT] Connecting to peer:', targetId);
    setConnectionStatus("Connecting...");

    // Connect data channel
    if (peerRef.current) {
      console.log('[CONNECT] Initiating data connection');
      const conn = peerRef.current.connect(targetId);
      setupDataConnection(conn);
    } else {
      console.error('[CONNECT] peerRef.current is null!');
    }

    // Use a dummy stream instead of asking for screen permission
    try {
      const stream = createDummyStream();
      const call = peerRef.current.call(targetId, stream);

      call.on('stream', (remoteStream: any) => {
        console.log('[CONNECT] Received remote stream');
        setRemoteStream(remoteStream);
      });

      callRef.current = call;
      setIsConnected(true);
      setConnectionStatus('Connected');
    } catch (err) {
      console.error('Failed to create dummy stream', err);
      setConnectionStatus('Failed to initialize connection');
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    setConnectionStatus("Accepting call...");

    // Use native capture if in Tauri, otherwise use browser API
    if (isTauriApp) {
      try {
        // Get monitors
        const monitorList = await invoke('get_monitors');
        setMonitors(monitorList as any[]);
        setShowMonitorSelect(true);
      } catch (err) {
        console.error('Failed to get monitors', err);
        setConnectionStatus('Failed to get monitors');
        setIncomingCall(null);
      }
    } else {
      // Browser mode - use getDisplayMedia
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then((stream) => {
          incomingCall.answer(stream);
          incomingCall.on('stream', (remoteStream: any) => {
            setRemoteStream(remoteStream);
          });
          setIsConnected(true);
          setConnectionStatus('Connected');
          callRef.current = incomingCall;
          setIncomingCall(null);
        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
          setConnectionStatus('Failed to get screen permission');
          setIncomingCall(null);
        });
    }
  };

  const startNativeCapture = async (monitorId: number) => {
    if (!canvasRef.current || !incomingCall) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Start capture
      await invoke('start_screen_capture', { monitorId });
      console.log('[CAPTURE] Started screen capture for monitor', monitorId);

      // Listen for monitor info and frames
      const { listen } = await import('@tauri-apps/api/event');

      const monitorUnlisten = await listen('monitor-info', (event: any) => {
        const info = event.payload;
        monitorDimensionsRef.current = { width: info.width, height: info.height };
        console.log('[CAPTURE] Monitor dimensions:', info.width, 'x', info.height);
      });

      let frameCount = 0;
      let lastFrameTime = 0;
      const targetFPS = 30;
      const frameInterval = 1000 / targetFPS;
      let pendingFrame: string | null = null;
      
      const unlisten = await listen('screen-frame', (event: any) => {
        const now = Date.now();
        // Throttle to target FPS to avoid overwhelming the renderer
        if (now - lastFrameTime < frameInterval) {
          pendingFrame = event.payload; // Store latest frame
          return;
        }
        lastFrameTime = now;
        
        // Use pending frame if available (latest frame)
        const base64Data = pendingFrame || event.payload;
        pendingFrame = null;
        
        frameCount++;
        if (frameCount % 60 === 0) {
          console.log('[CAPTURE] Received', frameCount, 'frames');
        }

        // Create new image for each frame to ensure proper loading
        const img = new Image();
        img.onload = () => {
          // Update canvas size if needed
          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
            console.log('[CAPTURE] Canvas resized to', img.width, 'x', img.height);
          }
          // Use requestAnimationFrame for smoother rendering
          requestAnimationFrame(() => {
            ctx.drawImage(img, 0, 0);
          });
        };
        img.onerror = (e) => {
          console.error('[CAPTURE] Failed to load image:', e);
        };
        img.src = `data:image/jpeg;base64,${base64Data}`;
      });

      // Create stream from canvas at 30 FPS for smooth playback
      const stream = canvas.captureStream(30);
      streamRef.current = stream;

      // Answer call with stream
      incomingCall.answer(stream);
      incomingCall.on('stream', (remoteStream: any) => {
        setRemoteStream(remoteStream);
      });

      setIsConnected(true);
      setConnectionStatus('Connected');
      callRef.current = incomingCall;
      setIncomingCall(null);
      setShowMonitorSelect(false);

      // Store unlisten for cleanup
      (window as any).__screenCaptureUnlisten = unlisten;
    } catch (err) {
      console.error('Failed to start native capture', err);
      setConnectionStatus('Failed to start screen capture');
      setIncomingCall(null);
      setShowMonitorSelect(false);
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      incomingCall.close();
      setIncomingCall(null);
      setConnectionStatus("Call rejected");
      setTimeout(() => setConnectionStatus("Ready to connect"), 2000);
    }
  };

  const disconnect = () => {
    if (callRef.current) callRef.current.close();
    if (dataConnRef.current) dataConnRef.current.close();

    // Stop native capture if active
    if (isTauriApp && streamRef.current) {
      invoke('stop_screen_capture').catch(console.error);
      if ((window as any).__screenCaptureUnlisten) {
        (window as any).__screenCaptureUnlisten();
      }
    }

    setIsConnected(false);
    setRemoteStream(null);
    setIncomingCall(null);
    setShowMonitorSelect(false);
    setConnectionStatus("Ready to connect");
    window.location.reload(); // Simple reset
  };

  const sendFile = (file: File) => {
    if (!dataConnRef.current) {
      showToast("No data connection");
      return;
    }

    const chunkSize = 16 * 1024; // 16KB chunks
    const conn = dataConnRef.current;

    // Send meta
    conn.send({
      type: 'file-meta',
      name: file.name,
      size: file.size,
      mimeType: file.type
    });

    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
      if (e.target?.result) {
        conn.send({
          type: 'file-chunk',
          data: e.target.result
        });
        offset += chunkSize;
        if (offset < file.size) {
          readNextChunk();
        } else {
          conn.send({ type: 'file-end' });
          showToast(`Sent file: ${file.name}`);
        }
      }
    };

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    readNextChunk();
  };

  const sendInputEvent = (event: any) => {
    if (dataConnRef.current) {
      console.log('[INPUT] Sending input event:', event);
      dataConnRef.current.send({
        type: 'input-event',
        payload: event
      });
    } else {
      console.warn('[INPUT] Cannot send input - dataConnRef.current is null');
    }
  };

  return (
    <div>
      {incomingCall && !isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Incoming Connection</h3>
              <p className="text-slate-300 text-[15px] leading-relaxed">
                <span className="font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-1 rounded">{incomingCall.peer}</span> wants to view your screen.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={rejectCall}
                className="flex-1 px-6 py-3.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold transition-all border border-red-500/30 hover:border-red-500/50"
              >
                Reject
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Accept & Share
              </button>
            </div>
          </div>
        </div>
      )}

      {showMonitorSelect && !isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Select Monitor to Share</h3>
              <p className="text-slate-300 text-[15px] leading-relaxed">
                Choose which monitor you want to share with the remote user.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {monitors.map((monitor: any) => (
                <button
                  key={monitor.id}
                  onClick={() => startNativeCapture(monitor.id)}
                  className="p-6 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 hover:border-indigo-500/50 rounded-xl transition-all text-left group backdrop-blur-sm"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/30 transition-colors border border-indigo-500/30">
                      <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white mb-1">{monitor.name}</div>
                      {monitor.is_primary && (
                        <span className="text-xs text-indigo-400 font-medium bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/30">Primary</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 font-mono">
                    {monitor.width} × {monitor.height}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowMonitorSelect(false);
                setIncomingCall(null);
              }}
              className="w-full px-6 py-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white font-semibold transition-all border border-slate-700/30"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isConnected ? (
        <ConnectionScreen
          myId={myId}
          onConnect={connectToPeer}
        />
      ) : (
        <SessionScreen
          remoteStream={remoteStream}
          onDisconnect={disconnect}
          onSendFile={sendFile}
          onSendInput={sendInputEvent}
          connectionStatus={connectionStatus}
        />
      )}
    </div>
  );
}

export default App;
