
"use client";

import { useParams, useRouter } from "next/navigation";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function MeetPage() {
  const params = useParams();
  const router = useRouter();
  const [roomName, setRoomName] = useState<string | null>(null);

  useEffect(() => {
    if (params.roomName) {
      setRoomName(decodeURIComponent(params.roomName as string));
    }
  }, [params.roomName]);

  if (!roomName) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Meeting...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <div className="absolute left-4 top-4 z-10">
        <Button onClick={() => router.push('/')} variant="secondary" size="sm">
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
      <JitsiMeeting
        roomName={roomName}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = "100vh";
          iframeRef.style.width = "100vw";
        }}
        configOverwrite={{
          startWithAudioMuted: false,
          disableModeratorIndicator: true,
          startScreenSharing: false,
          enableEmailInStats: false,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          FILM_STRIP_VIEW_ENABLED: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        }}
      />
    </div>
  );
}
