"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { useState } from "react";

interface CuecardSessionSetupProps {
  onStartSession: (config: SessionConfig) => void;
  onClose: () => void;
}

interface SessionConfig {
  weeks: string[];
  materials: string[];
  cardCount: number;
}

export function CuecardSessionSetup({
  onStartSession,
  onClose,
}: CuecardSessionSetupProps) {
  const [selectedWeeks, setSelectedWeeks] = useState<string>("all");
  const [selectedMaterials, setSelectedMaterials] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("both");
  const [cardCount] = useState(40);

  const handleStartSession = () => {
    const config: SessionConfig = {
      weeks: selectedWeeks === "all" ? [] : [selectedWeeks],
      materials: selectedMaterials === "all" ? [] : [selectedMaterials],
      cardCount,
    };
    onStartSession(config);
  };

  return (
    <div className="bg-background flex justify-center mt-10">
      <Card className="w-full max-w-4xl relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 bg-muted hover:bg-muted/80 rounded-full"
          onClick={onClose}
        >
          <X className="h-6 w-6 text-muted-foreground" />
        </Button>

        <CardHeader className="text-center pb-8">
          <CardTitle className="text-2xl font-semibold">
            Start a Cue card Session
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Cue card session use spaced repetition, prioritizing cards you get
            wrong to focus on areas you're struggling with, rather than those
            you've mastered
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="materials-select" className="text-sm font-medium">
                Select Materials
              </label>
              <Select
                value={selectedMaterials}
                onValueChange={setSelectedMaterials}
              >
                <SelectTrigger id="materials-select" className="w-full">
                  <SelectValue placeholder="All PDFs selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All PDFs selected</SelectItem>
                  <SelectItem value="pdf1">
                    Practical Guide to Building LLMs
                  </SelectItem>
                  <SelectItem value="pdf2">
                    Advanced AI Architectures
                  </SelectItem>
                  <SelectItem value="pdf3">
                    Neural Networks Fundamentals
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label htmlFor="mode-select" className="text-sm font-medium">
                Select Cue card Mode
              </label>
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger id="mode-select" className="w-full">
                  <SelectValue placeholder="Select cue card mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keywords">Keywords</SelectItem>
                  <SelectItem value="definitions">Definitions</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Your session will contain {cardCount} unique cue cards
            </div>
            <Button
              onClick={handleStartSession}
              className="px-8 py-3 text-base font-medium"
            >
              Start session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
