import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const StudentNotes = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notesData, error } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
    } else {
      setEditingNote(null);
      setNoteTitle("");
      setNoteContent("");
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('student_notes')
          .update({
            title: noteTitle,
            content: noteContent
          })
          .eq('id', editingNote.id);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from('student_notes')
          .insert({
            student_id: user.id,
            title: noteTitle,
            content: noteContent
          });

        if (error) throw error;
      }

      toast.success(t('student.noteSaved'), {
        description: t('student.noteSavedDesc')
      });

      fetchNotes();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      const { error } = await supabase
        .from('student_notes')
        .delete()
        .eq('id', noteToDelete);

      if (error) throw error;

      toast.success(t('student.noteDeleted'), {
        description: t('student.noteDeletedDesc')
      });

      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error("Failed to delete note");
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-6xl mx-auto py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/student/course")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              {t('student.myNotes')}
            </h1>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('student.addNote')}
          </Button>
        </div>

        {notes.length === 0 ? (
          <Card className="p-12 text-center">
            <NotebookPen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">{t('student.noNotes')}</h3>
            <p className="text-muted-foreground mb-6">{t('student.createFirstNote')}</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              {t('student.addNote')}
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {notes.map((note) => (
              <Card key={note.id} className="p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold flex-1">{note.title}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(note)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setNoteToDelete(note.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {note.content}
                </p>

                <p className="text-xs text-muted-foreground">
                  {t('common.created')}: {format(new Date(note.created_at), 'PPp')}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Note Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? t('student.editNote') : t('student.addNote')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="noteTitle">{t('student.noteTitle')}</Label>
              <Input
                id="noteTitle"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder={t('student.noteTitlePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="noteContent">{t('student.noteContent')}</Label>
              <Textarea
                id="noteContent"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={t('student.noteContentPlaceholder')}
                className="min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveNote} disabled={saving}>
              {saving ? t('common.loading') : t('student.saveNote')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('student.deleteNote')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive">
              {t('student.deleteNote')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentNotes;
