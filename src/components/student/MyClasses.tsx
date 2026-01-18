import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, User, Calendar, MapPin, Play, Video, ChevronDown, ChevronUp, X, Check, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  watched: boolean;
}

export const MyClasses = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classVideos, setClassVideos] = useState<Record<string, VideoInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string; id: string } | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [markingWatched, setMarkingWatched] = useState<string | null>(null);

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
          fetchMyClasses();
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
          fetchMyClasses();
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
          fetchMyClasses();
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("email", session.user.email)
        .maybeSingle();

      if (!student) return;
      setStudentId(student.id);

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

      // Fetch watched videos
      const { data: watchedData } = await supabase
        .from("student_video_progress")
        .select("video_id")
        .eq("student_id", student.id);

      const watchedVideoIds = new Set(watchedData?.map(w => w.video_id) || []);

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
          watched: watchedVideoIds.has(video.id),
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
    setPlayingVideo({ url: video.video_url, title: video.title, id: video.id });
  };

  const handleMarkWatched = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!studentId || markingWatched) return;

    setMarkingWatched(videoId);
    try {
      // Check if already watched
      const isWatched = Object.values(classVideos)
        .flat()
        .find(v => v.id === videoId)?.watched;

      if (isWatched) {
        // Remove watched status
        await supabase
          .from("student_video_progress")
          .delete()
          .eq("student_id", studentId)
          .eq("video_id", videoId);
        
        toast.success("Marked as unwatched");
      } else {
        // Add watched status
        await supabase
          .from("student_video_progress")
          .insert({
            student_id: studentId,
            video_id: videoId,
          });
        
        toast.success("Marked as watched!");
      }

      // Update local state
      setClassVideos(prev => {
        const updated = { ...prev };
        for (const classId in updated) {
          updated[classId] = updated[classId].map(v => 
            v.id === videoId ? { ...v, watched: !isWatched } : v
          );
        }
        return updated;
      });
    } catch (error) {
      console.error("Error updating watch status:", error);
      toast.error("Failed to update watch status");
    } finally {
      setMarkingWatched(null);
    }
  };

  const getClassProgress = (classId: string) => {
    const videos = classVideos[classId] || [];
    const watched = videos.filter(v => v.watched).length;
    return { watched, total: videos.length };
  };

  const getClassStatus = (classId: string) => {
    const { watched, total } = getClassProgress(classId);
    if (total === 0) return "no-lessons";
    if (watched === total) return "completed";
    if (watched > 0) return "in-progress";
    return "not-started";
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
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">My Classes</h3>

      {/* Video Player Modal */}
      {playingVideo && (
        <Card className="mb-4 overflow-hidden border-2 border-primary/30">
          <div className="flex justify-between items-center p-3 bg-muted">
            <h4 className="font-medium text-sm">{playingVideo.title}</h4>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => handleMarkWatched(playingVideo.id, e)}
                disabled={markingWatched === playingVideo.id}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark as Watched
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPlayingVideo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <video 
            src={playingVideo.url} 
            controls 
            autoPlay 
            className="w-full max-h-[500px] bg-black"
            controlsList="nodownload"
          >
            Your browser does not support the video tag.
          </video>
        </Card>
      )}

      {/* Course Curriculum Section */}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold mb-4">Course Curriculum</h4>
        
        {classes.map((classInfo, classIndex) => {
          const videos = classVideos[classInfo.id] || [];
          const isExpanded = expandedClasses.includes(classInfo.id);
          const { watched, total } = getClassProgress(classInfo.id);
          const status = getClassStatus(classInfo.id);

          return (
            <Collapsible 
              key={classInfo.id} 
              open={isExpanded} 
              onOpenChange={() => toggleClassExpanded(classInfo.id)}
            >
              <Card 
                className={`overflow-hidden transition-colors ${
                  status === 'completed' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                    : status === 'in-progress'
                    ? 'bg-background border-primary/30'
                    : 'bg-muted/30 border-muted'
                }`}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="p-4 flex items-center gap-4">
                    {/* Status Circle */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      status === 'completed' 
                        ? 'bg-green-500 text-white' 
                        : status === 'in-progress'
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground border-2 border-muted-foreground/30'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <span className="font-semibold">{classIndex + 1}</span>
                      )}
                    </div>

                    {/* Class Info */}
                    <div className="flex-1 text-left">
                      <h5 className={`font-semibold ${status === 'not-started' && total > 0 ? 'text-muted-foreground' : ''}`}>
                        {classInfo.class_name} - {classInfo.level || classInfo.course_name}
                      </h5>
                      <div className="flex items-center gap-2 mt-1">
                        {status === 'completed' && (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white">
                            Completed
                          </Badge>
                        )}
                        {status === 'in-progress' && (
                          <Badge variant="destructive" className="bg-red-500">
                            In Progress
                          </Badge>
                        )}
                        {status === 'not-started' && total > 0 && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Locked
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {watched} / {total} lessons
                        </span>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    {total > 0 && (
                      <div className="text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {videos.length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      <div className="border-t pt-3">
                        {videos.map((video, index) => (
                          <div 
                            key={video.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              video.watched 
                                ? 'bg-green-100/50 dark:bg-green-900/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handlePlayVideo(video)}
                          >
                            {/* Play Button */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              video.watched 
                                ? 'bg-green-500 text-white' 
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}>
                              {video.watched ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Play className="w-5 h-5" />
                              )}
                            </div>

                            {/* Video Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Lesson {index + 1}: {video.title}
                                </span>
                                {video.watched && (
                                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                    Watched
                                  </Badge>
                                )}
                              </div>
                              {video.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {video.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>{video.teacher_name}</span>
                              </div>
                            </div>

                            {/* Mark Watched Button */}
                            <Button
                              size="sm"
                              variant={video.watched ? "outline" : "default"}
                              onClick={(e) => handleMarkWatched(video.id, e)}
                              disabled={markingWatched === video.id}
                              className="flex-shrink-0"
                            >
                              {markingWatched === video.id ? (
                                "..."
                              ) : video.watched ? (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Watched
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Mark Watched
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};