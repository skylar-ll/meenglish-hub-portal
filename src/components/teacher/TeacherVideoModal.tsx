import { useState, useEffect } from "react";
import { X, Upload, Trash2, Play, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TeacherVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeacherVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  level: string;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

export const TeacherVideoModal = ({ isOpen, onClose }: TeacherVideoModalProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [levels, setLevels] = useState<{ id: string; value: string }[]>([]);
  
  const [videos, setVideos] = useState<TeacherVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  
  // Upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
      fetchLevels();
    }
  }, [isOpen]);

  const fetchLevels = async () => {
    const { data } = await supabase
      .from("form_configurations")
      .select("id, config_value")
      .eq("config_type", "level")
      .eq("is_active", true)
      .order("display_order");
    setLevels((data || []).map(l => ({ id: l.id, value: l.config_value })));
  };

  const fetchVideos = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("teacher_videos")
      .select("*")
      .eq("teacher_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!title || !level || !file) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("teacher-videos")
        .getPublicUrl(fileName);

      // Insert record
      const { error: insertError } = await supabase
        .from("teacher_videos")
        .insert({
          teacher_id: session.user.id,
          title,
          description: description || null,
          video_url: urlData.publicUrl,
          level,
          file_name: file.name,
          file_size: file.size,
        });

      if (insertError) throw insertError;

      toast({
        title: language === 'ar' ? 'تم الرفع بنجاح' : 'Upload Successful',
        description: language === 'ar' ? 'تم رفع الفيديو بنجاح' : 'Video uploaded successfully',
      });

      // Reset form
      setTitle("");
      setDescription("");
      setLevel("");
      setFile(null);
      fetchVideos();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: language === 'ar' ? 'فشل الرفع' : 'Upload Failed',
        description: error.message || 'Failed to upload video',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (video: TeacherVideo) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الفيديو؟' : 'Are you sure you want to delete this video?')) {
      return;
    }

    try {
      // Delete from storage
      const filePath = video.video_url.split("/teacher-videos/")[1];
      if (filePath) {
        await supabase.storage.from("teacher-videos").remove([filePath]);
      }

      // Delete record
      const { error } = await supabase
        .from("teacher_videos")
        .delete()
        .eq("id", video.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الفيديو بنجاح' : 'Video deleted successfully',
      });
      fetchVideos();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: language === 'ar' ? 'فشل الحذف' : 'Delete Failed',
        description: error.message || 'Failed to delete video',
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            {language === 'ar' ? 'إدارة الفيديوهات' : 'Manage Videos'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Video Player */}
        {playingVideo && (
          <div className="mb-6 bg-black rounded-lg overflow-hidden">
            <div className="flex justify-end p-2 bg-muted">
              <Button size="sm" variant="ghost" onClick={() => setPlayingVideo(null)}>
                Close Player
              </Button>
            </div>
            <video 
              src={playingVideo} 
              controls 
              autoPlay 
              className="w-full max-h-[400px]"
            />
          </div>
        )}

        {/* Upload Form */}
        <Card className="p-4 mb-6 bg-muted/50">
          <h3 className="font-semibold mb-4">
            {language === 'ar' ? 'رفع فيديو جديد' : 'Upload New Video'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العنوان' : 'Title'} *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={language === 'ar' ? 'عنوان الفيديو' : 'Video title'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المستوى' : 'Level'} *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المستوى' : 'Select level'} />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(l => (
                    <SelectItem key={l.id} value={l.value}>{l.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'ar' ? 'وصف اختياري' : 'Optional description'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملف الفيديو' : 'Video File'} *</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} ({formatFileSize(file.size)})
                </p>
              )}
            </div>
          </div>
          <Button 
            onClick={handleUpload} 
            className="mt-4 w-full md:w-auto" 
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {language === 'ar' ? 'رفع الفيديو' : 'Upload Video'}
          </Button>
        </Card>

        {/* Videos List */}
        <div>
          <h3 className="font-semibold mb-4">
            {language === 'ar' ? 'الفيديوهات المرفوعة' : 'Uploaded Videos'}
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد فيديوهات بعد' : 'No videos uploaded yet'}
            </p>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => (
                <Card key={video.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{video.title}</h4>
                        <Badge variant="secondary">{video.level}</Badge>
                      </div>
                      {video.description && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {video.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(video.file_size)} • {format(new Date(video.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPlayingVideo(video.video_url)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(video)}
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

        <Button onClick={onClose} variant="outline" className="w-full mt-6">
          {language === 'ar' ? 'إغلاق' : 'Close'}
        </Button>
      </Card>
    </div>
  );
};
