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

  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const dataConnRef = useRef<any>(null);

  // File transfer state
  const incomingFileRef = useRef<{ meta: any; chunks: ArrayBuffer[] } | null>(null);

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", (id: any) => {
      setMyId(id);
      setConnectionStatus("Ready to connect");
    });

    peer.on("call", async (call: any) => {
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then((stream) => {
          call.answer(stream);
          call.on('stream', (remoteStream: any) => {
            setRemoteStream(remoteStream);
          });
          setIsConnected(true);
          setConnectionStatus('Connected');
          callRef.current = call;
        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
          setConnectionStatus('Failed to get screen permission');
        });
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
    dataConnRef.current = conn;

    conn.on("open", () => {
      console.log("Data connection open");
    });

    conn.on("data", async (data: any) => {
      // Handle different data types
      // PeerJS might send data as ArrayBuffer or string/object depending on serialization
      // For simplicity, let's assume objects are sent as JSON if not binary

      if (data && data.type === 'input-event') {
        // Handle remote input event
        try {
          await invoke('simulate_input', { event: data.payload });
        } catch (e) {
          console.error('Failed to simulate input:', e);
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
      console.log("Data connection closed");
    });
  };

  const connectToPeer = async (targetId: string) => {
    setConnectionStatus("Connecting...");

    // Connect data channel
    if (peerRef.current) {
      const conn = peerRef.current.connect(targetId);
      setupDataConnection(conn);
    }

    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      .then((stream) => {
        const call = peerRef.current.call(targetId, stream);
        call.on('stream', (remoteStream: any) => {
          setRemoteStream(remoteStream);
        });
        callRef.current = call;
        setIsConnected(true);
        setConnectionStatus('Connected');
      })
      .catch((err) => {
        console.error('Failed to get local stream', err);
        setConnectionStatus('Failed to get screen permission');
      });
  };

  const disconnect = () => {
    if (callRef.current) callRef.current.close();
    if (dataConnRef.current) dataConnRef.current.close();

    setIsConnected(false);
    setRemoteStream(null);
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
      dataConnRef.current.send({
        type: 'input-event',
        payload: event
      });
    }
  };

  return (
    <div>
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
