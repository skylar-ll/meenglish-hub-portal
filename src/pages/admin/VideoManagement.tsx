import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Video, Trash2, Play, Upload, Search, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface TeacherVideo {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  video_url: string;
  level: string;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  teacher?: {
    full_name: string;
  };
}

const VideoManagement = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<{ id: string; value: string }[]>([]);
  const [videos, setVideos] = useState<TeacherVideo[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  
  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadLevel, setUploadLevel] = useState("");
  const [uploadTeacherId, setUploadTeacherId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchVideos();
    fetchTeachers();
    fetchLevels();
  }, []);

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
    const { data, error } = await supabase
      .from("teacher_videos")
      .select(`
        *,
        teacher:teachers(full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load videos");
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from("teachers")
      .select("id, full_name")
      .order("full_name");
    setTeachers(data || []);
  };

  const handleUpload = async () => {
    if (!uploadTitle || !uploadLevel || !uploadTeacherId || !uploadFile) {
      toast.error("Please fill all required fields");
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${uploadTeacherId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-videos")
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("teacher-videos")
        .getPublicUrl(fileName);

      // Insert record
      const { error: insertError } = await supabase
        .from("teacher_videos")
        .insert({
          teacher_id: uploadTeacherId,
          title: uploadTitle,
          description: uploadDescription || null,
          video_url: urlData.publicUrl,
          level: uploadLevel,
          file_name: uploadFile.name,
          file_size: uploadFile.size,
        });

      if (insertError) throw insertError;

      toast.success("Video uploaded successfully");
      setUploadOpen(false);
      resetUploadForm();
      fetchVideos();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadLevel("");
    setUploadTeacherId("");
    setUploadFile(null);
  };

  const handleDelete = async (video: TeacherVideo) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

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

      toast.success("Video deleted successfully");
      fetchVideos();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete video");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.teacher?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "all" || video.level === filterLevel;
    const matchesTeacher = filterTeacher === "all" || video.teacher_id === filterTeacher;
    return matchesSearch && matchesLevel && matchesTeacher;
  });

  // Group videos by teacher and level for centralized view
  const groupedByTeacher = filteredVideos.reduce((acc, video) => {
    const teacherName = video.teacher?.full_name || "Unknown";
    if (!acc[teacherName]) {
      acc[teacherName] = {};
    }
    if (!acc[teacherName][video.level]) {
      acc[teacherName][video.level] = [];
    }
    acc[teacherName][video.level].push(video);
    return acc;
  }, {} as Record<string, Record<string, TeacherVideo[]>>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto max-w-7xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Teacher & Video Management
            </h1>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload New Video</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Teacher *</Label>
                  <Select value={uploadTeacherId} onValueChange={setUploadTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Level *</Label>
                  <Select value={uploadLevel} onValueChange={setUploadLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map(l => (
                        <SelectItem key={l.id} value={l.value}>{l.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input 
                    value={uploadTitle} 
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Video title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={uploadDescription} 
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Video File *</Label>
                  <Input 
                    type="file"
                    accept="video/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  {uploadFile && (
                    <p className="text-sm text-muted-foreground">
                      {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleUpload} 
                  className="w-full" 
                  disabled={uploading}
                >
                  {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Upload Video
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or teacher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levels.map(l => (
                    <SelectItem key={l.id} value={l.value}>{l.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Video Player Modal */}
        {playingVideo && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Video Player</h3>
                <Button variant="ghost" size="sm" onClick={() => setPlayingVideo(null)}>
                  Close
                </Button>
              </div>
              <video 
                src={playingVideo} 
                controls 
                autoPlay
                className="w-full rounded-lg max-h-[70vh]"
              />
            </Card>
          </div>
        )}

        {/* Centralized View by Teacher */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : Object.keys(groupedByTeacher).length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Videos Yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first video to get started
            </p>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByTeacher).map(([teacherName, levelVideos]) => (
              <Card key={teacherName} className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  {teacherName}
                </h2>
                <div className="space-y-4">
                  {Object.entries(levelVideos).map(([level, vids]) => (
                    <div key={level} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-sm">{level}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {vids.length} video{vids.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Uploaded</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vids.map(video => (
                            <TableRow key={video.id}>
                              <TableCell className="font-medium">{video.title}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {video.description || "-"}
                              </TableCell>
                              <TableCell>{formatFileSize(video.file_size)}</TableCell>
                              <TableCell>
                                {format(new Date(video.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
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
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoManagement;
