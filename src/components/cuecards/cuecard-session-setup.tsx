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
import { useQueryState } from "@/hooks/use-query-state";
import type {
  CuecardConfig,
  CuecardMode,
  DifficultyLevel,
  FocusType,
  PracticeMode,
} from "@/lib/stores/cuecard-session/types";
import { X } from "lucide-react";
import { useEffect } from "react";

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
  const { searchParams, setQueryState } = useQueryState();

  // Initialize state from URL or defaults
  const selectedCourse =
    searchParams.get("courseId") || (courses.length > 0 ? courses[0].id : "");
  const selectedWeek = searchParams.get("week") || "all-weeks";
  const selectedMode = (searchParams.get("mode") as CuecardMode) || "both";
  const cardCount = searchParams.get("count") || "20";
  const difficulty =
    (searchParams.get("difficulty") as DifficultyLevel) || "mixed";
  const focus = (searchParams.get("focus") as FocusType) || "tailored-for-me";
  const practiceMode =
    (searchParams.get("practiceMode") as PracticeMode) || "practice";

  const { data: weeks = [], isLoading: loadingWeeks } =
    useCourseWeeks(selectedCourse);

  // When selectedCourse changes, if the selectedWeek is not in the new list of weeks, reset it.
  useEffect(() => {
    if (
      !loadingWeeks &&
      weeks.length > 0 &&
      selectedWeek !== "all-weeks" &&
      !weeks.some((w) => w.id === selectedWeek)
    ) {
      setQueryState({ week: "all-weeks" });
    }
  }, [weeks, selectedWeek, loadingWeeks, setQueryState]);

  const handleStartSession = () => {
    if (!selectedCourse) {
      return;
    }

    const config: CuecardConfig = {
      courseId: selectedCourse,
      weeks: selectedWeek === "all-weeks" ? [] : [selectedWeek],
      difficulty: difficulty,
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
            <Select
              value={selectedCourse}
              onValueChange={(value) => setQueryState({ courseId: value })}
            >
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
              onValueChange={(value) => setQueryState({ week: value })}
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
                      onValueChange={(value) =>
                        setQueryState({ difficulty: value })
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
                    <Select
                      value={cardCount}
                      onValueChange={(value) => setQueryState({ count: value })}
                    >
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
                      onValueChange={(value) => setQueryState({ focus: value })}
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
                      onValueChange={(value) => setQueryState({ mode: value })}
                    >
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both</SelectItem>
                        <SelectItem value="term-first">Term First</SelectItem>
                        <SelectItem value="definition-first">
                          Definition First
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose which side of the card to see first.
                    </p>
                  </div>

                  {/* Practice Mode Selection */}
                  <RadioGroup
                    value={practiceMode}
                    onValueChange={(value) =>
                      setQueryState({ practiceMode: value })
                    }
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem
                        value="practice"
                        id="practice"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="practice"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        Practice
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Get instant feedback.
                      </p>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="exam"
                        id="exam"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="exam"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        Exam
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        See results at the end.
                      </p>
                    </div>
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>

        <CardFooter className="px-8 pb-8">
          <Button className="w-full h-12" onClick={handleStartSession}>
            Start Session
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
