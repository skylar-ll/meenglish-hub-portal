import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Video, Play, Loader2, User, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface ClassInfo {
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
  created_at: string;
  teacher?: {
    full_name: string;
  };
  class?: ClassInfo;
}

const StudentVideos = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [videos, setVideos] = useState<TeacherVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassInfo[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/student/login");
        return;
      }

      // Get student record
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("email", session.user.email)
        .maybeSingle();

      if (!student) {
        setLoading(false);
        return;
      }

      // Get enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", student.id);

      const classIds = enrollments?.map(e => e.class_id) || [];

      if (classIds.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Get class details
      const { data: classData } = await supabase
        .from("classes")
        .select("id, class_name, timing, levels, courses")
        .in("id", classIds);

      setEnrolledClasses(classData || []);

      // Fetch videos for student's enrolled classes (RLS will also filter)
      const { data: videosData, error } = await supabase
        .from("teacher_videos")
        .select(`
          *,
          teacher:teachers(full_name),
          class:classes(id, class_name, timing, levels, courses)
        `)
        .in("class_id", classIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
      } else {
        setVideos(videosData || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // Group videos by class
  const groupedByClass = videos.reduce((acc, video) => {
    const className = video.class?.class_name || "Unknown Class";
    if (!acc[className]) {
      acc[className] = {
        class: video.class,
        videos: []
      };
    }
    acc[className].videos.push(video);
    return acc;
  }, {} as Record<string, { class?: ClassInfo; videos: TeacherVideo[] }>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto max-w-4xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/student/course")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'رجوع' : 'Back'}
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {language === 'ar' ? 'فيديوهات الدروس' : 'Lesson Videos'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? `متابعة الفيديوهات في ${enrolledClasses.length} فصل` 
                  : `Videos from your ${enrolledClasses.length} enrolled class${enrolledClasses.length !== 1 ? 'es' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Video Player */}
        {playingVideo && (
          <Card className="mb-6 overflow-hidden">
            <div className="flex justify-end p-2 bg-muted">
              <Button size="sm" variant="ghost" onClick={() => setPlayingVideo(null)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>
            <video 
              src={playingVideo} 
              controls 
              autoPlay 
              className="w-full max-h-[500px]"
            />
          </Card>
        )}

        {/* Videos List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {language === 'ar' ? 'لا توجد فيديوهات' : 'No Videos Available'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'لم يقم معلمك برفع أي فيديوهات لفصولك بعد'
                : "Your teachers haven't uploaded any videos for your classes yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByClass).map(([className, { class: classInfo, videos: classVideos }]) => (
              <Card key={className} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">{className}</h2>
                  {classInfo?.levels && classInfo.levels.length > 0 && (
                    <Badge variant="outline">{classInfo.levels.join(", ")}</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {classVideos.length} {language === 'ar' ? 'فيديو' : 'video'}{classVideos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {classVideos.map((video) => (
                    <Card 
                      key={video.id} 
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => setPlayingVideo(video.video_url)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Play className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{video.title}</h4>
                          {video.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {video.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{video.teacher?.full_name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{format(new Date(video.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
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

export default StudentVideos;