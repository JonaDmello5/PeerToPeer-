
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, ArrowRight, CornerUpLeft } from "lucide-react";

export default function Home() {
  const [offerSdp, setOfferSdp] = useState("");
  const router = useRouter();

  const createRoom = () => {
    router.push(`/room/local`);
  };

  const joinRoom = () => {
    if (offerSdp.trim()) {
      const encodedSdp = btoa(offerSdp.trim());
      router.push(`/room/remote?offer=${encodedSdp}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-4 mb-8">
        <Video className="w-16 h-16 text-primary" />
        <h1 className="text-5xl font-bold font-headline text-primary">Connect Now</h1>
      </div>
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-headline">Manual Video Call</CardTitle>
          <CardDescription className="text-center">
            Create a room to generate an offer, or paste one to join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={createRoom}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CornerUpLeft className="mr-2 h-4 w-4" />
            Create a New Call
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or join with an offer
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Paste offer from peer here..."
              value={offerSdp}
              onChange={(e) => setOfferSdp(e.target.value)}
              className="flex-grow"
              rows={5}
            />
            <Button
              onClick={joinRoom}
              variant="secondary"
              className="w-full"
              disabled={!offerSdp.trim()}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Join Call
            </Button>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-sm text-muted-foreground">
        <p>Powered by WebRTC</p>
      </footer>
    </main>
  );
}
