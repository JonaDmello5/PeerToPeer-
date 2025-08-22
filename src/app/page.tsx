
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, ArrowRight } from "lucide-react";

export default function Home() {
  const [roomName, setRoomName] = useState("");
  const router = useRouter();

  const joinRoom = () => {
    if (roomName.trim()) {
      router.push(`/meet/${encodeURIComponent(roomName.trim())}`);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      joinRoom();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-4 mb-8">
        <Video className="w-16 h-16 text-primary" />
        <h1 className="text-5xl font-bold font-headline text-primary">Connect Now</h1>
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-headline">Join or Create a Meeting</CardTitle>
          <CardDescription className="text-center">
            Enter a room name to start or join a video call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow"
            />
            <Button
              onClick={joinRoom}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!roomName.trim()}
              aria-label="Join Room"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-sm text-muted-foreground">
        <p>Powered by Jitsi</p>
      </footer>
    </main>
  );
}
