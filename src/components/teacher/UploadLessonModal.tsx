import { useState, useEffect } from "react";
import { X, Upload, FileText, Trash2, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface TeacherVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  class_id: string;
  file_name: string | null;
  created_at: string;
  class?: TeacherClass;
}

export const UploadLessonModal = ({ isOpen, onClose }: UploadLessonModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [videos, setVideos] = useState<TeacherVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchClassesAndVideos();
    }
  }, [isOpen]);

  const fetchClassesAndVideos = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch teacher's classes
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, class_name, timing, levels, courses")
      .eq("teacher_id", session.user.id);

    if (classesData) {
      setClasses(classesData);
    }

    // Fetch teacher's videos
    const { data: videosData } = await supabase
      .from("teacher_videos")
      .select("id, title, description, video_url, class_id, file_name, created_at")
      .eq("teacher_id", session.user.id)
      .order("created_at", { ascending: false });

    if (videosData && classesData) {
      // Map class info to videos
      const classMap = new Map(classesData.map(c => [c.id, c]));
      const transformed = videosData.map((v: any) => ({
        ...v,
        class: classMap.get(v.class_id) || null
      }));
      setVideos(transformed);
    }

    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!lessonTitle || !file || !selectedClassId) {
      toast({
        title: t('teacher.error'),
        description: "Please fill in title, select a class, and choose a video file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Upload video to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("teacher-videos")
        .getPublicUrl(fileName);

      // Insert video record
      const { error: insertError } = await supabase
        .from("teacher_videos")
        .insert({
          teacher_id: session.user.id,
          class_id: selectedClassId,
          title: lessonTitle,
          description: description || null,
          video_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
        });

      if (insertError) throw insertError;

      toast({
        title: t('teacher.lessonUploaded'),
        description: `Video "${lessonTitle}" uploaded successfully!`,
      });

      // Reset form and refresh
      setLessonTitle("");
      setDescription("");
      setSelectedClassId("");
      setFile(null);
      fetchClassesAndVideos();

    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (videoId: string, videoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = videoUrl.split("/teacher-videos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("teacher-videos").remove([filePath]);
      }

      // Delete record
      const { error } = await supabase
        .from("teacher_videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;

      toast({
        title: "Video Deleted",
        description: "Video has been removed successfully",
      });

      fetchClassesAndVideos();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete video",
        variant: "destructive",
      });
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
          {/* Upload Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Upload New Video</h3>
            
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
                placeholder="Enter a description for this video..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="classSelect">Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose which class this video is for..." />
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

            <div>
              <Label htmlFor="fileUpload">{t('teacher.selectFile')}</Label>
              <Input
                id="fileUpload"
                type="file"
                onChange={handleFileChange}
                accept="video/*"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('teacher.selectedFile')}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button 
              onClick={handleUpload} 
              className="w-full" 
              disabled={uploading || !lessonTitle || !file || !selectedClassId}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {t('teacher.uploadLesson')}
                </>
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
            ) : videos.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No videos uploaded yet
              </p>
            ) : (
              <div className="space-y-3">
                {videos.map((video) => (
                  <Card key={video.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Video className="w-8 h-8 text-primary mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium">{video.title}</h4>
                          {video.description && (
                            <p className="text-sm text-muted-foreground">{video.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {video.class && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {video.class.class_name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(video.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(video.video_url, '_blank')}
                        >
                          Play
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(video.id, video.video_url)}
                        >
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
