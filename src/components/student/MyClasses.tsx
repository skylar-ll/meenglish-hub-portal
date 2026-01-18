import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, User, Calendar, MapPin, Play, Video, ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClassInfo {
  id: string;
  class_name: string;
  timing: string;
  course_name: string;
  level?: string;
  teacher_name: string;
  start_date?: string;
  branch_name?: string;
}

interface VideoInfo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  created_at: string;
  teacher_name: string;
}

export const MyClasses = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classVideos, setClassVideos] = useState<Record<string, VideoInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchMyClasses();
    
    // Set up realtime subscription for class updates
    const classesChannel = supabase
      .channel('classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes'
        },
        () => {
          fetchMyClasses(); // Refetch when classes are updated
        }
      )
      .subscribe();

    // Set up realtime subscription for enrollment updates
    const enrollmentsChannel = supabase
      .channel('enrollments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments'
        },
        () => {
          fetchMyClasses(); // Refetch when enrollments are updated
        }
      )
      .subscribe();

    // Set up realtime subscription for video updates
    const videosChannel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_videos'
        },
        () => {
          fetchMyClasses(); // Refetch when videos are updated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(classesChannel);
      supabase.removeChannel(enrollmentsChannel);
      supabase.removeChannel(videosChannel);
    };
  }, []);

  const fetchMyClasses = async () => {
    try {
      // Get current student
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("email", session.user.email)
        .maybeSingle();

      if (!student) return;

      // Get student's classes
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", student.id);

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      // Get class details
      const classIds = enrollments.map((e) => e.class_id);
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          timing,
          courses,
          levels,
          teacher_id,
          start_date,
          branch_id,
          branches (name_en, name_ar),
          teachers (full_name)
        `)
        .in("id", classIds);

      if (classesError) throw classesError;

      const formattedClasses = classesData?.map((cls: any) => ({
        id: cls.id,
        class_name: cls.class_name,
        timing: cls.timing,
        course_name: cls.courses?.join(", ") || "N/A",
        level: cls.levels?.join(", ") || undefined,
        teacher_name: cls.teachers?.full_name || "N/A",
        start_date: cls.start_date || undefined,
        branch_name: cls.branches?.name_en || "N/A",
      })) || [];

      setClasses(formattedClasses);

      // Fetch videos for all enrolled classes
      const { data: videosData } = await supabase
        .from("teacher_videos")
        .select(`
          id,
          title,
          description,
          video_url,
          created_at,
          class_id,
          teacher:teachers(full_name)
        `)
        .in("class_id", classIds)
        .order("created_at", { ascending: true });

      // Group videos by class_id
      const videosByClass: Record<string, VideoInfo[]> = {};
      videosData?.forEach((video: any) => {
        if (!videosByClass[video.class_id]) {
          videosByClass[video.class_id] = [];
        }
        videosByClass[video.class_id].push({
          id: video.id,
          title: video.title,
          description: video.description,
          video_url: video.video_url,
          created_at: video.created_at,
          teacher_name: video.teacher?.full_name || "Unknown",
        });
      });

      setClassVideos(videosByClass);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load your classes");
    } finally {
      setLoading(false);
    }
  };

  const toggleClassExpanded = (classId: string) => {
    setExpandedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handlePlayVideo = (video: VideoInfo) => {
    setPlayingVideo({ url: video.video_url, title: video.title });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading your classes...</div>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          You are not enrolled in any classes yet.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">My Classes</h3>

      {/* Video Player Modal */}
      {playingVideo && (
        <Card className="mb-4 overflow-hidden border-2 border-primary/30">
          <div className="flex justify-between items-center p-3 bg-muted">
            <h4 className="font-medium text-sm">{playingVideo.title}</h4>
            <Button size="sm" variant="ghost" onClick={() => setPlayingVideo(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <video 
            src={playingVideo.url} 
            controls 
            autoPlay 
            className="w-full max-h-[400px]"
          />
        </Card>
      )}

      <div className="grid gap-4">
        {classes.map((classInfo) => {
          const videos = classVideos[classInfo.id] || [];
          const isExpanded = expandedClasses.includes(classInfo.id);
          const hasVideos = videos.length > 0;

          return (
            <Card key={classInfo.id} className="overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg text-primary">{classInfo.class_name}</h4>
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    {classInfo.timing}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Courses:</span>
                    <span className="font-medium">{classInfo.course_name}</span>
                  </div>

                  {classInfo.level && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-secondary" />
                      <span className="text-muted-foreground">Levels:</span>
                      <span className="font-medium">{classInfo.level}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" />
                    <span className="text-muted-foreground">Teacher:</span>
                    <span className="font-medium">{classInfo.teacher_name}</span>
                  </div>

                  {classInfo.branch_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Branch:</span>
                      <span className="font-medium">{classInfo.branch_name}</span>
                    </div>
                  )}

                  {classInfo.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-secondary" />
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{new Date(classInfo.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Course Curriculum / Videos Section */}
                {hasVideos && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleClassExpanded(classInfo.id)}
                      className="w-full justify-between hover:bg-primary/10"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        <span className="font-medium">Course Curriculum</span>
                        <Badge variant="outline" className="text-xs">
                          {videos.length} lesson{videos.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {videos.map((video, index) => (
                          <Card 
                            key={video.id} 
                            className="p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => handlePlayVideo(video)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                                <Play className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Lesson {index + 1}
                                  </Badge>
                                  <h5 className="font-medium text-sm truncate">{video.title}</h5>
                                </div>
                                {video.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {video.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  <span>{video.teacher_name}</span>
                                  <span>•</span>
                                  <span>{format(new Date(video.created_at), "MMM d, yyyy")}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!hasVideos && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Video className="w-4 h-4" />
                      <span>No lessons uploaded yet</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
