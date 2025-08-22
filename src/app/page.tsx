
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Video, Loader2 } from "lucide-react";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const createRoom = async () => {
    setIsCreating(true);
    try {
      const roomsCollection = collection(firestore, "rooms");
      const roomRef = await addDoc(roomsCollection, {});
      router.push(`/room/${roomRef.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setIsCreating(false);
    }
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      setIsJoining(true);
      router.push(`/room/${roomId.trim()}`);
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
          <CardTitle className="text-center text-2xl font-headline">Video Call</CardTitle>
          <CardDescription className="text-center">
            Create a room or join with an ID to start a call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={createRoom}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isCreating || isJoining}
          >
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            {isCreating ? "Creating Room..." : "Create Room"}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or join a room
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-grow"
              onKeyUp={(e) => e.key === 'Enter' && joinRoom()}
            />
            <Button
              onClick={joinRoom}
              variant="secondary"
              disabled={isJoining || isCreating || !roomId.trim()}
            >
              {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Join
            </Button>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-sm text-muted-foreground">
        <p>Powered by WebRTC & Firebase</p>
      </footer>
    </main>
  );
}
