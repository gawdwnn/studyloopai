"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourseWeeks } from "@/hooks/use-course-week";
import type {
  CuecardConfig,
  CuecardMode,
  DifficultyLevel,
  FocusType,
  PracticeMode,
} from "@/lib/stores/cuecard-session/types";
import { X } from "lucide-react";
import { useState } from "react";

type Course = {
  id: string;
  name: string;
  description: string | null;
};

interface CuecardSessionSetupProps {
  courses: Course[];
  onStartSession: (config: CuecardConfig) => void;
  onClose: () => void;
}

export function CuecardSessionSetup({
  courses,
  onStartSession,
  onClose,
}: CuecardSessionSetupProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>(
    courses.length > 0 ? courses[0].id : ""
  );

  const { data: weeks = [], isLoading: loadingWeeks } =
    useCourseWeeks(selectedCourse);

  const [selectedWeek, setSelectedWeek] = useState<string>("all-weeks");
  const [selectedMode, setSelectedMode] = useState<CuecardMode>("both");
  const [cardCount, setCardCount] = useState<string>("20");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [focus, setFocus] = useState<FocusType>("tailored-for-me");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("practice");

  const handleStartSession = () => {
    if (!selectedCourse) {
      return;
    }

    const config: CuecardConfig = {
      courseId: selectedCourse,
      weeks: selectedWeek === "all-weeks" ? [] : [selectedWeek],
      difficulty: difficulty || "mixed",
      focus: focus,
      practiceMode: practiceMode,
      cardCount: Number.parseInt(cardCount),
      mode: selectedMode,
    };
    onStartSession(config);
  };

  if (courses.length === 0) {
    return (
      <div className="bg-background flex justify-center mt-10">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-lg">No Courses Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Please create a course first to start a cuecard session.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-lg">Start a Cue Card Session</CardTitle>
        </CardHeader>

        <CardContent className="px-8 space-y-6">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="course-select" className="text-sm font-medium">
              Select Course
            </Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="h-12 w-full">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Week Selection */}
          <div className="space-y-2">
            <Label htmlFor="week-select" className="text-sm font-medium">
              Select Week
            </Label>
            <Select
              value={selectedWeek}
              onValueChange={setSelectedWeek}
              disabled={loadingWeeks}
            >
              <SelectTrigger className="h-12 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-weeks">All weeks selected</SelectItem>
                {weeks.map((week) => (
                  <SelectItem key={week.id} value={week.id}>
                    {week.title || `Week ${week.weekNumber}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingWeeks && (
              <p className="text-xs text-muted-foreground">Loading weeks...</p>
            )}
          </div>

          {/* Settings Section */}
          <div className="">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="settings" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-medium">Settings</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  {/* Difficulty Selection */}
                  <div className="space-y-2">
                    <Select
                      value={difficulty}
                      onValueChange={(v) =>
                        setDifficulty(v as DifficultyLevel | "")
                      }
                    >
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue placeholder="Select difficulty of the cards" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Number of Cards */}
                  <div className="space-y-2">
                    <Select value={cardCount} onValueChange={setCardCount}>
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="40">40</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the number of cards
                    </p>
                  </div>

                  {/* Focus Selection */}
                  <div className="space-y-2">
                    <Select
                      value={focus}
                      onValueChange={(v) => setFocus(v as FocusType)}
                    >
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tailored-for-me">
                          Tailored for me
                        </SelectItem>
                        <SelectItem value="weak-areas">
                          Focus on weak areas
                        </SelectItem>
                        <SelectItem value="recent-content">
                          Recent content
                        </SelectItem>
                        <SelectItem value="comprehensive">
                          Comprehensive review
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select Focus
                    </p>
                    <p className="text-xs text-muted-foreground">
                      "Tailored for me" includes cards you've struggled with and
                      uses spaced repetition.
                    </p>
                  </div>

                  {/* Card Mode Selection */}
                  <div className="space-y-2">
                    <Select
                      value={selectedMode}
                      onValueChange={(v) => setSelectedMode(v as CuecardMode)}
                    >
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keywords">Keywords only</SelectItem>
                        <SelectItem value="definitions">
                          Definitions only
                        </SelectItem>
                        <SelectItem value="both">
                          Both keywords and definitions
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select card mode
                    </p>
                  </div>

                  {/* Practice/Exam Mode */}
                  <div className="space-y-4">
                    <RadioGroup
                      value={practiceMode}
                      onValueChange={(v) => setPracticeMode(v as PracticeMode)}
                      className="flex gap-8"
                    >
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="practice" id="practice" />
                          <Label htmlFor="practice" className="font-medium">
                            Practice Mode
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Get immediate feedback on cards.
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="exam" id="exam" />
                          <Label htmlFor="exam" className="font-medium">
                            Exam Mode
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Review all answers at the end.
                        </p>
                      </div>
                    </RadioGroup>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">
            Your session will contain {cardCount} unique cue cards
          </p>
          <div className="bg-accent/50 border border-accent rounded-lg p-4 max-w-2xl text-center">
            <p className="text-sm text-accent-foreground">
              <strong>Spaced Repetition:</strong> Cue cards use spaced
              repetition, prioritizing cards you get wrong to focus on areas
              you're struggling with, rather than those you've mastered. This
              helps maximize your learning efficiency.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleStartSession}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
            disabled={!selectedCourse}
          >
            Start
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
