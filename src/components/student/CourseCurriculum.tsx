import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Check, CheckCircle2, ChevronDown, ChevronUp, X, FileText, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClassInfo {
  id: string;
  class_name: string;
  level?: string;
  course_name: string;
}

interface LessonInfo {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  text_content: string | null;
  lesson_type: string;
  created_at: string;
  teacher_name: string;
  watched: boolean;
}

interface CourseCurriculumProps {
  onProgressChange?: () => void;
}

export const CourseCurriculum = ({ onProgressChange }: CourseCurriculumProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classLessons, setClassLessons] = useState<Record<string, LessonInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string; id: string } | null>(null);
  const [expandedTextLesson, setExpandedTextLesson] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [markingWatched, setMarkingWatched] = useState<string | null>(null);

  useEffect(() => {
    fetchCurriculum();
    
    const videosChannel = supabase
      .channel('videos-changes-curriculum')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_videos' },
        () => fetchCurriculum()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(videosChannel);
    };
  }, []);

  const fetchCurriculum = async () => {
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

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", student.id);

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const classIds = enrollments.map((e) => e.class_id);

      const { data: classesData } = await supabase
        .from("classes")
        .select("id, class_name, courses, levels, teachers(full_name)")
        .in("id", classIds);

      const formattedClasses = classesData?.map((cls: any) => ({
        id: cls.id,
        class_name: cls.class_name,
        course_name: cls.courses?.join(", ") || "N/A",
        level: cls.levels?.join(", ") || undefined,
      })) || [];

      setClasses(formattedClasses);

      // Fetch lessons for enrolled classes
      const { data: lessonsData } = await supabase
        .from("teacher_videos")
        .select(`
          id, title, description, video_url, text_content, lesson_type, created_at, class_id, lesson_order,
          teacher:teachers(full_name)
        `)
        .in("class_id", classIds)
        .order("lesson_order", { ascending: true })
        .order("created_at", { ascending: true });

      // Fetch watched progress
      const { data: watchedData } = await supabase
        .from("student_video_progress")
        .select("video_id")
        .eq("student_id", student.id);

      const watchedIds = new Set(watchedData?.map(w => w.video_id) || []);

      // Group lessons by class
      const lessonsByClass: Record<string, LessonInfo[]> = {};
      lessonsData?.forEach((lesson: any) => {
        if (!lessonsByClass[lesson.class_id]) {
          lessonsByClass[lesson.class_id] = [];
        }
        lessonsByClass[lesson.class_id].push({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          video_url: lesson.video_url,
          text_content: lesson.text_content,
          lesson_type: lesson.lesson_type || 'video',
          created_at: lesson.created_at,
          teacher_name: lesson.teacher?.full_name || "Unknown",
          watched: watchedIds.has(lesson.id),
        });
      });

      setClassLessons(lessonsByClass);
    } catch (error) {
      console.error("Error fetching curriculum:", error);
      toast.error("Failed to load curriculum");
    } finally {
      setLoading(false);
    }
  };

  const toggleClassExpanded = (classId: string) => {
    setExpandedClasses(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handlePlayVideo = (lesson: LessonInfo) => {
    if (lesson.video_url) {
      setPlayingVideo({ url: lesson.video_url, title: lesson.title, id: lesson.id });
      setExpandedTextLesson(null);
    }
  };

  const handleToggleTextLesson = (lessonId: string) => {
    setExpandedTextLesson(prev => prev === lessonId ? null : lessonId);
    setPlayingVideo(null);
  };

  const handleMarkWatched = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!studentId || markingWatched) return;

    setMarkingWatched(lessonId);
    try {
      const isWatched = Object.values(classLessons)
        .flat()
        .find(l => l.id === lessonId)?.watched;

      if (isWatched) {
        await supabase
          .from("student_video_progress")
          .delete()
          .eq("student_id", studentId)
          .eq("video_id", lessonId);
        toast.success("Marked as unwatched");
      } else {
        await supabase
          .from("student_video_progress")
          .insert({ student_id: studentId, video_id: lessonId });
        toast.success("Marked as watched!");
      }

      setClassLessons(prev => {
        const updated = { ...prev };
        for (const classId in updated) {
          updated[classId] = updated[classId].map(l => 
            l.id === lessonId ? { ...l, watched: !isWatched } : l
          );
        }
        return updated;
      });

      // Notify parent about progress change
      onProgressChange?.();
    } catch (error) {
      console.error("Error updating watch status:", error);
      toast.error("Failed to update status");
    } finally {
      setMarkingWatched(null);
    }
  };

  const getClassProgress = (classId: string) => {
    const lessons = classLessons[classId] || [];
    const watched = lessons.filter(l => l.watched).length;
    return { watched, total: lessons.length };
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
        <div className="text-center text-muted-foreground">Loading curriculum...</div>
      </Card>
    );
  }

  const classesWithLessons = classes.filter(c => (classLessons[c.id] || []).length > 0);

  if (classesWithLessons.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Course</h3>
        <div className="text-center text-muted-foreground">
          No lessons available yet. Check back later!
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Course</h3>

      {/* Video Player */}
      {playingVideo && (
        <Card className="overflow-hidden border-2 border-primary/30">
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

      {/* Text Lesson Viewer */}
      {expandedTextLesson && (
        <Card className="overflow-hidden border-2 border-secondary/30">
          {(() => {
            const lesson = Object.values(classLessons).flat().find(l => l.id === expandedTextLesson);
            if (!lesson) return null;
            return (
              <>
                <div className="flex justify-between items-center p-3 bg-muted">
                  <h4 className="font-medium text-sm">{lesson.title}</h4>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => handleMarkWatched(lesson.id, e)}
                      disabled={markingWatched === lesson.id}
                      className="text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Mark as Read
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpandedTextLesson(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{lesson.text_content}</p>
                </div>
              </>
            );
          })()}
        </Card>
      )}

      {/* Curriculum List */}
      <div className="space-y-2">
        {classesWithLessons.map((classInfo, classIndex) => {
          const lessons = classLessons[classInfo.id] || [];
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

                    <div className="flex-1 text-left">
                      <h5 className={`font-semibold ${status === 'not-started' ? 'text-muted-foreground' : ''}`}>
                        {classInfo.class_name} {classInfo.level && `- ${classInfo.level}`}
                      </h5>
                      <div className="flex items-center gap-2 mt-1">
                        {status === 'completed' && (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>
                        )}
                        {status === 'in-progress' && (
                          <Badge variant="destructive" className="bg-red-500">In Progress</Badge>
                        )}
                        {status === 'not-started' && (
                          <Badge variant="outline" className="text-muted-foreground">Not Started</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">{watched} / {total} lessons</span>
                      </div>
                    </div>

                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {lessons.map((lesson, index) => (
                      <div 
                        key={lesson.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          lesson.watched 
                            ? 'bg-green-100/50 dark:bg-green-900/20' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          if (lesson.lesson_type === 'text') {
                            handleToggleTextLesson(lesson.id);
                          } else {
                            handlePlayVideo(lesson);
                          }
                        }}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          lesson.watched 
                            ? 'bg-green-500 text-white' 
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}>
                          {lesson.watched ? (
                            <Check className="w-5 h-5" />
                          ) : lesson.lesson_type === 'text' ? (
                            <FileText className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Lesson {index + 1}: {lesson.title}
                            </span>
                            {lesson.watched && (
                              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                {lesson.lesson_type === 'text' ? 'Read' : 'Watched'}
                              </Badge>
                            )}
                            {lesson.lesson_type === 'text' && (
                              <Badge variant="secondary" className="text-xs">Text</Badge>
                            )}
                            {lesson.lesson_type === 'mixed' && (
                              <Badge variant="secondary" className="text-xs">Video + Text</Badge>
                            )}
                          </div>
                          {lesson.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {lesson.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{lesson.teacher_name}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={lesson.watched ? "outline" : "default"}
                          onClick={(e) => handleMarkWatched(lesson.id, e)}
                          disabled={markingWatched === lesson.id}
                          className="flex-shrink-0"
                        >
                          {markingWatched === lesson.id ? "..." : lesson.watched ? (
                            <><Check className="w-4 h-4 mr-1" /> Done</>
                          ) : (
                            <><Check className="w-4 h-4 mr-1" /> Mark Done</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};