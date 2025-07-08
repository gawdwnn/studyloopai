"use client";

import { Edit3, FileText, Filter, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

import {
  type ConflictError,
  type CreateOwnNoteInput,
  type OwnNote,
  useCreateOwnNote,
  useDeleteOwnNote,
  useOwnNotes,
  useUpdateOwnNote,
} from "@/hooks/use-own-notes";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownRenderer } from "./markdown-renderer";

interface UserNotesEditorProps {
  courseId: string;
  weekId: string;
}

export function UserNotesEditor({ courseId, weekId }: UserNotesEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteType, setSelectedNoteType] = useState<string>("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<OwnNote | null>(null);
  const [conflict, setConflict] = useState<
    (ConflictError & { localContent: string; noteId: string }) | null
  >(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const notesPerPage = 5;

  const { toast } = useToast();

  // Fetch notes with filters
  const {
    data: notes = [],
    isLoading,
    error,
  } = useOwnNotes({
    courseId,
    weekId,
    searchQuery: searchQuery || undefined,
    noteType: selectedNoteType === "all" ? undefined : selectedNoteType,
  });

  const createNoteMutation = useCreateOwnNote({
    onSuccess: () => {
      toast({ title: "Note created successfully" });
      setIsEditorOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useUpdateOwnNote({
    onSuccess: () => {
      toast({ title: "Note updated successfully" });
      setIsEditorOpen(false);
      setEditingNote(null);
    },
    onError: (error: Error) => {
      try {
        const conflictError: ConflictError = JSON.parse(error.message);
        if (conflictError.type === "version_conflict" && editingNote) {
          setConflict({
            ...conflictError,
            noteId: editingNote.id,
            localContent: editingNote.content,
          });
          setIsEditorOpen(false); // Close editor, open conflict dialog
        } else {
          throw error;
        }
      } catch {
        toast({
          title: "Error updating note",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteNoteMutation = useDeleteOwnNote({
    onSuccess: () => {
      toast({ title: "Note deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateNote = (content: string, title: string) => {
    const newNote: CreateOwnNoteInput = {
      courseId,
      weekId,
      title: title || "Untitled Note",
      content,
      noteType: "general",
      tags: [],
      isPrivate: true,
      color: "#ffffff",
    };
    createNoteMutation.mutate(newNote);
  };

  const handleUpdateNote = (note: OwnNote, content: string, title: string) => {
    updateNoteMutation.mutate({
      id: note.id,
      content,
      title,
      version: note.version,
    });
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNoteMutation.mutate(noteId);
  };

  const handleOpenCreate = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (note: OwnNote) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleConflictResolution = (strategy: "client" | "server") => {
    if (!conflict) return;

    let contentToSave = "";
    if (strategy === "client") {
      contentToSave = conflict.localContent;
    } else if (strategy === "server" && conflict.serverData) {
      contentToSave = (conflict.serverData as OwnNote).content;
    }

    updateNoteMutation.mutate({
      id: conflict.noteId,
      content: contentToSave,
      version: conflict.serverVersion, // Overwrite with server version
    });

    setConflict(null);
  };

  const noteTypes = [
    { value: "all", label: "All Notes" },
    { value: "general", label: "General" },
    { value: "annotation", label: "Annotation" },
    { value: "summary", label: "Summary" },
    { value: "question", label: "Question" },
  ];

  // Paginated notes
  const paginatedNotes = notes.slice(
    (currentPage - 1) * notesPerPage,
    currentPage * notesPerPage
  );
  const totalPages = Math.ceil(notes.length / notesPerPage);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((id) => (
            <Card key={`skeleton-${id}`}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to load notes</h3>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedNoteType} onValueChange={setSelectedNoteType}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {noteTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>

        <NoteEditorDialog
          isOpen={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          note={editingNote}
          onSave={(note, content, title) => {
            if (note) {
              handleUpdateNote(note, content, title);
            } else {
              handleCreateNote(content, title);
            }
          }}
          isLoading={
            createNoteMutation.isPending || updateNoteMutation.isPending
          }
        />

        <ConflictResolutionDialog
          conflict={conflict}
          onResolve={handleConflictResolution}
          onCancel={() => setConflict(null)}
        />
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first note to get started with personal note-taking.
          </p>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {paginatedNotes.map((note) => (
              <Card key={note.id} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">
                          {note.noteType || "General"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(note)}
                        disabled={updateNoteMutation.isPending}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        title="Delete Note"
                        description="This will permanently delete this note. This action cannot be undone."
                        onConfirm={() => handleDeleteNote(note.id)}
                        disabled={deleteNoteMutation.isPending}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={deleteNoteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <MarkdownRenderer content={note.content} />
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Pagination Controls Component
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-disabled={currentPage === 1}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
        <PaginationItem>
          <span className="text-sm font-medium p-2">
            Page {currentPage} of {totalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage === totalPages}
            className={
              currentPage === totalPages
                ? "pointer-events-none opacity-50"
                : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// Note Editor Dialog
interface NoteEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  note: OwnNote | null;
  onSave: (note: OwnNote | null, content: string, title: string) => void;
  isLoading: boolean;
}

function NoteEditorDialog({
  isOpen,
  onOpenChange,
  note,
  onSave,
  isLoading,
}: NoteEditorDialogProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");

  useEffect(() => {
    if (isOpen) {
      setTitle(note?.title || "");
      setContent(note?.content || "");
    }
  }, [isOpen, note]);

  const handleSave = () => {
    if (content.trim()) {
      onSave(note, content, title.trim() || "Untitled Note");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{note ? "Edit Note" : "Create New Note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Input
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
          />
          <div className="flex-1 min-h-0">
            <MarkdownEditor
              content={content}
              onSave={setContent}
              placeholder="Start writing your note..."
              autoSave={false}
              height={400}
              enableFullscreen={true}
              enableDraftSave={true}
              draftKey={note ? `edit-note-${note.id}` : "new-note-draft"}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !content.trim()}
            >
              {isLoading
                ? note
                  ? "Saving..."
                  : "Creating..."
                : note
                  ? "Save Changes"
                  : "Create Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Conflict Resolution Dialog
interface ConflictResolutionDialogProps {
  conflict: (ConflictError & { localContent: string }) | null;
  onResolve: (strategy: "client" | "server") => void;
  onCancel: () => void;
}

function ConflictResolutionDialog({
  conflict,
  onResolve,
  onCancel,
}: ConflictResolutionDialogProps) {
  if (!conflict) return null;

  const serverContent = (conflict.serverData as OwnNote)?.content || "";

  return (
    <Dialog open={!!conflict} onOpenChange={onCancel}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Resolve Edit Conflict</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Your note has been modified by another session. Choose which version
            to keep.
          </p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-semibold mb-2">Your Version (Client)</h3>
            <Card className="h-96 overflow-y-auto">
              <CardContent className="p-4">
                <MarkdownRenderer content={conflict.localContent} />
              </CardContent>
            </Card>
            <Button className="w-full mt-4" onClick={() => onResolve("client")}>
              Keep Your Version
            </Button>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Latest Version (Server)</h3>
            <Card className="h-96 overflow-y-auto">
              <CardContent className="p-4">
                <MarkdownRenderer content={serverContent} />
              </CardContent>
            </Card>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => onResolve("server")}
            >
              Use Latest Version
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
