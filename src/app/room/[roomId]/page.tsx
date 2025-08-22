
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Loader2, LinkIcon, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

type Role = 'local' | 'remote';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const role = params.roomId as Role;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isHangingUp, setIsHangingUp] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [offerSdp, setOfferSdp] = useState('');
  const [answerSdp, setAnswerSdp] = useState('');
  const [remoteSdp, setRemoteSdp] = useState('');

  const [iceCandidates, setIceCandidates] = useState<RTCIceCandidate[]>([]);
  const [gatheredCandidates, setGatheredCandidates] = useState('');
  const [remoteCandidates, setRemoteCandidates] = useState('');
  
  const [isOfferCopied, setIsOfferCopied] = useState(false);
  const [isAnswerCopied, setIsAnswerCopied] = useState(false);
  const [isCandidatesCopied, setIsCandidatesCopied] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const hangUp = useCallback(() => {
    setIsHangingUp(true);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();
    router.push('/');
  }, [router]);

  useEffect(() => {
    const setupWebRTC = async () => {
      try {
        const pc = new RTCPeerConnection(servers);
        peerConnectionRef.current = pc;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        
        remoteStreamRef.current = new MediaStream();
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
        
        pc.ontrack = event => {
          event.streams[0].getTracks().forEach(track => {
            remoteStreamRef.current?.addTrack(track);
          });
          setIsConnected(true);
        };
        
        pc.onicecandidate = e => {
            if (e.candidate) {
                setIceCandidates(prev => [...prev, e.candidate]);
            }
        };

        pc.onicegatheringstatechange = () => {
            if(pc.iceGatheringState === 'complete') {
                setGatheredCandidates(JSON.stringify(pc.localDescription));
            }
        };

        if (role === 'local') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          setOfferSdp(JSON.stringify(offer));
        } else if (role === 'remote') {
          const offerSdp = searchParams.get('offer');
          if (offerSdp) {
            const decodedOffer = atob(offerSdp);
            setOfferSdp(decodedOffer);
            const offer = JSON.parse(decodedOffer);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            setAnswerSdp(JSON.stringify(answer));
          }
        }
      } catch (error) {
        console.error("WebRTC setup failed:", error);
        toast({ title: "Error", description: "Could not start video call. Check permissions.", variant: "destructive" });
      }
    };
    
    setupWebRTC();

    return () => {
      if (!isHangingUp) {
        hangUp();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRemoteDescription = async () => {
    try {
        if (!peerConnectionRef.current) return;
        const sdp = JSON.parse(remoteSdp);
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Invalid SDP Answer.", variant: "destructive" });
    }
  };

  const addRemoteCandidates = async () => {
    try {
        if (!peerConnectionRef.current || !remoteCandidates) return;
        const candidates = JSON.parse(remoteCandidates) as RTCIceCandidate[];
        for (const candidate of candidates) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        toast({ title: "Success", description: "ICE candidates added." });
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Invalid ICE candidates.", variant: "destructive" });
    }
  };
  
  const copyToClipboard = (text: string, callback: () => void) => {
    navigator.clipboard.writeText(text);
    callback();
    setTimeout(() => {
        if (callback === setIsOfferCopied) setIsOfferCopied(false);
        if (callback === setIsAnswerCopied) setIsAnswerCopied(false);
        if (callback === setIsCandidatesCopied) setIsCandidatesCopied(false);
    }, 2000);
    toast({title: "Copied to clipboard!"});
  }

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    setIsMicMuted(prev => !prev);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    setIsCameraOff(prev => !prev);
  };

  const finalCandidates = JSON.stringify(iceCandidates);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="p-4 flex justify-between items-center border-b">
        <h1 className="text-xl font-bold font-headline text-primary">Connect Now</h1>
        <Button onClick={() => router.push('/')} variant="outline" size="sm">
            End Call & Go Home
        </Button>
      </header>
      
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="relative flex items-center justify-center overflow-hidden bg-black shadow-lg rounded-lg">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">You</div>
            </Card>
            <Card className="relative flex items-center justify-center overflow-hidden bg-black shadow-lg rounded-lg">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">Peer</div>
                {!isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                        <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                        <p className="text-lg font-headline">Waiting for peer to connect...</p>
                    </div>
                )}
            </Card>
        </div>
        
        <Card className="lg:col-span-1 flex flex-col shadow-lg rounded-lg overflow-hidden">
            <CardContent className="p-4 space-y-4 overflow-y-auto">
              <Alert>
                <LinkIcon className="h-4 w-4" />
                <AlertTitle>Connection Instructions</AlertTitle>
                <AlertDescription>
                  {role === 'local' 
                    ? "1. Copy the offer and send it to your peer. 2. Paste their answer below."
                    : "1. Send your answer to your peer. 2. Paste their final candidates below."
                  }
                </AlertDescription>
              </Alert>
              
              {role === 'local' && offerSdp && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Offer (Step 1)</label>
                  <Textarea readOnly value={offerSdp} rows={4} className="text-xs"/>
                  <Button size="sm" onClick={() => copyToClipboard(offerSdp, () => setIsOfferCopied(true))} className="w-full">
                    {isOfferCopied ? <Check className="mr-2"/> : <Copy className="mr-2"/>}
                    {isOfferCopied ? 'Copied' : 'Copy Offer'}
                  </Button>
                </div>
              )}

              {role === 'local' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Peer's Answer (Step 2)</label>
                  <Textarea placeholder="Paste answer from peer..." value={remoteSdp} onChange={e => setRemoteSdp(e.target.value)} rows={4} className="text-xs"/>
                  <Button size="sm" onClick={setRemoteDescription} disabled={!remoteSdp}>Set Answer</Button>
                </div>
              )}

              {role === 'remote' && answerSdp && (
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Your Answer (Step 1)</label>
                    <Textarea readOnly value={answerSdp} rows={4} className="text-xs"/>
                    <Button size="sm" onClick={() => copyToClipboard(answerSdp, () => setIsAnswerCopied(true))} className="w-full">
                       {isAnswerCopied ? <Check className="mr-2"/> : <Copy className="mr-2"/>}
                       {isAnswerCopied ? 'Copied' : 'Copy Answer'}
                    </Button>
                 </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Your ICE Candidates</label>
                <Textarea readOnly value={finalCandidates} rows={4} className="text-xs"/>
                <Button size="sm" onClick={() => copyToClipboard(finalCandidates, () => setIsCandidatesCopied(true))} className="w-full" disabled={!finalCandidates || finalCandidates === '[]'}>
                    {isCandidatesCopied ? <Check className="mr-2"/> : <Copy className="mr-2"/>}
                    {isCandidatesCopied ? 'Copied' : 'Copy Candidates'}
                </Button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Peer's ICE Candidates</label>
                <Textarea placeholder="Paste candidates from peer..." value={remoteCandidates} onChange={e => setRemoteCandidates(e.target.value)} rows={4} className="text-xs"/>
                <Button size="sm" onClick={addRemoteCandidates} disabled={!remoteCandidates}>Add Candidates</Button>
              </div>
            </CardContent>
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
