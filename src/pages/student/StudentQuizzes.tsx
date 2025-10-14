import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Quiz {
  id: string;
  title: string;
  total_points: number;
  created_at: string;
  question_count: number;
  attempt?: {
    id: string;
    submitted_at: string | null;
    score: number | null;
  };
}

const StudentQuizzes = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all published quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id, title, total_points, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      // Get question counts and attempt status for each quiz
      const quizzesWithDetails = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          // Count questions
          const { count } = await supabase
            .from('quiz_questions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);

          // Check for existing attempt
          const { data: attemptData } = await supabase
            .from('quiz_attempts')
            .select('id, submitted_at, score')
            .eq('quiz_id', quiz.id)
            .eq('student_id', user.id)
            .maybeSingle();

          return {
            ...quiz,
            question_count: count || 0,
            attempt: attemptData || undefined
          };
        })
      );

      setQuizzes(quizzesWithDetails);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
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
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/course")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            {t('student.availableQuizzes')}
          </h1>
        </div>

        {quizzes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('teacher.noQuizzes')}</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('common.created')}: {format(new Date(quiz.created_at), 'PPP')}
                    </p>
                  </div>
                  {quiz.attempt?.submitted_at ? (
                    <Badge className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t('student.quizCompleted')}
                    </Badge>
                  ) : quiz.attempt ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      In Progress
                    </Badge>
                  ) : (
                    <Badge variant="outline">{t('student.quizNotStarted')}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">{t('student.questions')}: </span>
                    <span className="font-medium">{quiz.question_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('student.totalPoints')}: </span>
                    <span className="font-medium">{quiz.total_points}</span>
                  </div>
                  {quiz.attempt?.submitted_at && quiz.attempt.score !== null && (
                    <div>
                      <span className="text-muted-foreground">{t('student.yourScore')}: </span>
                      <span className="font-medium">{quiz.attempt.score} / {quiz.total_points}</span>
                    </div>
                  )}
                </div>

                {!quiz.attempt?.submitted_at && (
                  <Button onClick={() => navigate(`/student/quiz/${quiz.id}`)}>
                    {t('student.takeQuiz')}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentQuizzes;
