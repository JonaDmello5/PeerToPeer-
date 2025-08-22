
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { firestore } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
  query,
  getDocs,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Public STUN servers
const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const roomId = params.roomId as string;

  // Refs for WebRTC objects to prevent re-renders
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  // State for UI controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isHangingUp, setIsHangingUp] = useState(false);
  const [status, setStatus] = useState("Initializing...");

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const hangUp = useCallback(async () => {
    setIsHangingUp(true);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();
    
    // Clean up Firestore documents
    if (roomId) {
      const roomRef = doc(firestore, 'rooms', roomId);
      const callerCandidatesQuery = query(collection(roomRef, 'callerCandidates'));
      const calleeCandidatesQuery = query(collection(roomRef, 'calleeCandidates'));
      
      const [callerCandidatesSnapshot, calleeCandidatesSnapshot] = await Promise.all([
        getDocs(callerCandidatesQuery),
        getDocs(calleeCandidatesQuery)
      ]);
      
      const batch = writeBatch(firestore);
      callerCandidatesSnapshot.forEach(doc => batch.delete(doc.ref));
      calleeCandidatesSnapshot.forEach(doc => batch.delete(doc.ref));
      batch.delete(roomRef);
      await batch.commit().catch(console.error);
    }

    router.push('/');
  }, [router, roomId]);

  // Main useEffect for setting up the WebRTC connection
  useEffect(() => {
    // This effect should run only once per component mount.
    // All WebRTC objects are stored in refs to prevent them from being re-created on re-renders.
    const setupWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        remoteStreamRef.current = new MediaStream();
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;

        const pc = new RTCPeerConnection(servers);
        peerConnectionRef.current = pc;

        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });

        pc.ontrack = event => {
          event.streams[0].getTracks().forEach(track => {
            remoteStreamRef.current?.addTrack(track);
          });
          setStatus("Connected");
        };

        const roomRef = doc(firestore, 'rooms', roomId);
        const roomSnapshot = await getDoc(roomRef);

        if (!roomSnapshot.exists()) {
          toast({ title: "Error", description: "Room not found.", variant: "destructive" });
          router.push('/');
          return;
        }

        const isRoomEmpty = Object.keys(roomSnapshot.data()).length === 0;
        const role = isRoomEmpty ? 'caller' : 'callee';

        if (role === 'caller') {
          setStatus("Creating room...");
          const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
          pc.onicecandidate = e => e.candidate && addDoc(callerCandidatesCollection, e.candidate.toJSON());

          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          await setDoc(roomRef, { offer: { type: offerDescription.type, sdp: offerDescription.sdp } });

          onSnapshot(roomRef, snapshot => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
          });

          onSnapshot(collection(roomRef, 'calleeCandidates'), s => s.docChanges().forEach(c => {
            if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data()));
          }));
          setStatus("Waiting for a peer to join...");

        } else { // Callee logic
          setStatus("Joining room...");
          const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
          pc.onicecandidate = e => e.candidate && addDoc(calleeCandidatesCollection, e.candidate.toJSON());

          await pc.setRemoteDescription(new RTCSessionDescription(roomSnapshot.data().offer));

          const answerDescription = await pc.createAnswer();
          await pc.setLocalDescription(answerDescription);
          await updateDoc(roomRef, { answer: { type: answerDescription.type, sdp: answerDescription.sdp } });

          onSnapshot(collection(roomRef, 'callerCandidates'), s => s.docChanges().forEach(c => {
            if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data()));
          }));
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            hangUp();
          }
        }
      } catch (error) {
        console.error("WebRTC setup failed:", error);
        toast({ title: "Error", description: "Could not start video call. Check permissions.", variant: "destructive" });
      }
    };
    
    setupWebRTC();

    // Cleanup function to run on component unmount
    return () => {
      hangUp();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    setIsMicMuted(prev => !prev);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    setIsCameraOff(prev => !prev);
  };
  
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({ title: "Copied!", description: "Room ID copied to clipboard." });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="p-4 flex justify-between items-center border-b">
        <h1 className="text-xl font-bold font-headline text-primary">Connect Now</h1>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Room ID: {roomId}</span>
            <Button variant="outline" size="sm" onClick={copyRoomId}>
                <Copy className="h-4 w-4 mr-2" />
                Copy ID
            </Button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        <Card className="relative flex items-center justify-center overflow-hidden bg-black shadow-lg rounded-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">You</div>
        </Card>
        <Card className="relative flex items-center justify-center overflow-hidden bg-black shadow-lg rounded-lg">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">Peer</div>
          {status !== "Connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                <Loader2 className="w-16 h-16 mb-4 animate-spin" />
                <p className="text-lg font-headline">{status}</p>
            </div>
          )}
        </Card>
      </main>

      <footer className="flex justify-center items-center p-4 border-t">
        <div className="flex items-center gap-4">
          <Button onClick={toggleMic} size="lg" className={cn('rounded-full w-16 h-16 transition-colors', isMicMuted ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-accent text-accent-foreground hover:bg-accent/90')}>
            {isMicMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button onClick={toggleCamera} size="lg" className={cn('rounded-full w-16 h-16 transition-colors', isCameraOff ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-accent text-accent-foreground hover:bg-accent/90')}>
            {isCameraOff ? <VideoOff /> : <Video />}
          </Button>
          <Button onClick={hangUp} variant="destructive" size="lg" className="rounded-full w-16 h-16" disabled={isHangingUp}>
            {isHangingUp ? <Loader2 className="animate-spin" /> : <PhoneOff />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
