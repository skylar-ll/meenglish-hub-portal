import { useState, useEffect } from "react";
import { X, Upload, Trash2, Video, Loader2, FileText, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface UploadLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeacherClass {
  id: string;
  class_name: string;
  timing: string;
  levels: string[] | null;
  courses: string[] | null;
}

interface TeacherLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  text_content: string | null;
  lesson_type: string;
  class_id: string;
  file_name: string | null;
  created_at: string;
  lesson_order: number;
  class?: TeacherClass;
}

export const UploadLessonModal = ({ isOpen, onClose }: UploadLessonModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [lessonType, setLessonType] = useState<"video" | "text" | "mixed">("video");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchClassesAndLessons();
    }
  }, [isOpen]);

  const fetchClassesAndLessons = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: classesData } = await supabase
      .from("classes")
      .select("id, class_name, timing, levels, courses")
      .eq("teacher_id", session.user.id);

    if (classesData) setClasses(classesData);

    const { data: lessonsData } = await supabase
      .from("teacher_videos")
      .select("id, title, description, video_url, text_content, lesson_type, class_id, file_name, created_at, lesson_order")
      .eq("teacher_id", session.user.id)
      .order("lesson_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (lessonsData && classesData) {
      const classMap = new Map(classesData.map(c => [c.id, c]));
      const transformed = lessonsData.map((l: any) => ({
        ...l,
        lesson_type: l.lesson_type || 'video',
        lesson_order: l.lesson_order || 0,
        class: classMap.get(l.class_id) || null
      }));
      setLessons(transformed);
    }

    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!lessonTitle || !selectedClassId) {
      toast({ title: t('teacher.error'), description: "Please fill in title and select a class", variant: "destructive" });
      return;
    }

    if (lessonType === "video" && !file) {
      toast({ title: t('teacher.error'), description: "Please select a video file", variant: "destructive" });
      return;
    }

    if (lessonType === "text" && !textContent.trim()) {
      toast({ title: t('teacher.error'), description: "Please enter text content", variant: "destructive" });
      return;
    }

    if (lessonType === "mixed" && (!file || !textContent.trim())) {
      toast({ title: t('teacher.error'), description: "Please provide both video and text content", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      let videoUrl: string | null = null;

      if (file && (lessonType === "video" || lessonType === "mixed")) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("teacher-videos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("teacher-videos")
          .getPublicUrl(fileName);

        videoUrl = urlData.publicUrl;
      }

      // Get next lesson order
      const existingLessons = lessons.filter(l => l.class_id === selectedClassId);
      const nextOrder = existingLessons.length > 0 
        ? Math.max(...existingLessons.map(l => l.lesson_order)) + 1 
        : 1;

      const { error: insertError } = await supabase
        .from("teacher_videos")
        .insert({
          teacher_id: session.user.id,
          class_id: selectedClassId,
          title: lessonTitle,
          description: description || null,
          video_url: videoUrl,
          text_content: lessonType !== "video" ? textContent : null,
          lesson_type: lessonType,
          file_name: file?.name || null,
          file_size: file?.size || null,
          lesson_order: nextOrder,
        });

      if (insertError) throw insertError;

      toast({ title: t('teacher.lessonUploaded'), description: `Lesson "${lessonTitle}" created successfully!` });

      // Reset form
      setLessonTitle("");
      setDescription("");
      setTextContent("");
      setSelectedClassId("");
      setLessonType("video");
      setFile(null);
      fetchClassesAndLessons();

    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Upload Failed", description: error.message || "Failed to create lesson", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (lessonId: string, videoUrl: string | null) => {
    try {
      if (videoUrl) {
        const urlParts = videoUrl.split("/teacher-videos/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("teacher-videos").remove([filePath]);
        }
      }

      const { error } = await supabase
        .from("teacher_videos")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      toast({ title: "Lesson Deleted", description: "Lesson has been removed successfully" });
      fetchClassesAndLessons();
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message || "Failed to delete lesson", variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('teacher.uploadLessons')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Create Lesson Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Create New Lesson</h3>
            
            {/* Lesson Type Tabs */}
            <Tabs value={lessonType} onValueChange={(v) => setLessonType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="video">
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="w-4 h-4 mr-2" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="mixed">
                  <Video className="w-4 h-4 mr-2" />
                  Mixed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="video" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="fileUpload">{t('teacher.selectFile')}</Label>
                  <Input id="fileUpload" type="file" onChange={handleFileChange} accept="video/*" />
                  {file && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('teacher.selectedFile')}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="textContent">Lesson Content</Label>
                  <Textarea
                    id="textContent"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter your lesson content here..."
                    rows={8}
                  />
                </div>
              </TabsContent>

              <TabsContent value="mixed" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="fileUploadMixed">{t('teacher.selectFile')}</Label>
                  <Input id="fileUploadMixed" type="file" onChange={handleFileChange} accept="video/*" />
                  {file && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('teacher.selectedFile')}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="textContentMixed">Additional Notes / Text Content</Label>
                  <Textarea
                    id="textContentMixed"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Add notes or additional content below the video..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div>
              <Label htmlFor="lessonTitle">{t('teacher.lessonTitle')}</Label>
              <Input
                id="lessonTitle"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder={t('teacher.lessonTitlePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a brief description..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="classSelect">Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose which class this lesson is for..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.class_name} - {cls.timing} 
                      {cls.levels && cls.levels.length > 0 && ` (${cls.levels.join(", ")})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classes.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground mt-1">
                  No classes assigned. Contact admin to assign you to a class.
                </p>
              )}
            </div>

            <Button 
              onClick={handleUpload} 
              className="w-full" 
              disabled={uploading || !lessonTitle || !selectedClassId}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Create Lesson</>
              )}
            </Button>
          </div>

          {/* Uploaded Videos List */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">{t('teacher.uploadedLessons')}</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : lessons.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No lessons created yet</p>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <Card key={lesson.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <GripVertical className="w-5 h-5 text-muted-foreground mt-1 cursor-grab" />
                        {lesson.lesson_type === 'text' ? (
                          <FileText className="w-8 h-8 text-secondary mt-1" />
                        ) : (
                          <Video className="w-8 h-8 text-primary mt-1" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{lesson.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {lesson.lesson_type === 'video' ? 'Video' : lesson.lesson_type === 'text' ? 'Text' : 'Mixed'}
                            </Badge>
                          </div>
                          {lesson.description && (
                            <p className="text-sm text-muted-foreground">{lesson.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {lesson.class && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {lesson.class.class_name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(lesson.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {lesson.video_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(lesson.video_url!, '_blank')}>
                            Play
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(lesson.id, lesson.video_url)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            {t('common.close')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
