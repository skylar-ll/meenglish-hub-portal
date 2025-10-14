import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Attempt {
  id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_points: number | null;
  grade: string | null;
  graded_at: string | null;
  student: {
    full_name_en: string;
    full_name_ar: string;
  };
}

const QuizAttempts = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [quizTitle, setQuizTitle] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizAndAttempts();
  }, [quizId]);

  const fetchQuizAndAttempts = async () => {
    try {
      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('title')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      setQuizTitle(quizData.title);

      // Fetch attempts with student info
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          student_id,
          started_at,
          submitted_at,
          score,
          total_points,
          grade,
          graded_at,
          profiles!quiz_attempts_student_id_fkey (
            full_name_en,
            full_name_ar
          )
        `)
        .eq('quiz_id', quizId)
        .order('started_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Transform data
      const transformedAttempts = attemptsData.map((attempt: any) => ({
        id: attempt.id,
        student_id: attempt.student_id,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        score: attempt.score,
        total_points: attempt.total_points,
        grade: attempt.grade,
        graded_at: attempt.graded_at,
        student: {
          full_name_en: attempt.profiles?.full_name_en || 'Unknown',
          full_name_ar: attempt.profiles?.full_name_ar || 'غير معروف'
        }
      }));

      setAttempts(transformedAttempts);
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
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
        <Button
          variant="ghost"
          onClick={() => navigate("/teacher/quizzes")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
          {quizTitle}
        </h1>
        <p className="text-muted-foreground mb-8">{t('teacher.studentAnswers')}</p>

        {attempts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t('common.noStudentsYet')}</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {attempts.map((attempt) => (
              <Card key={attempt.id} className="p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {attempt.student.full_name_en}
                    </h3>
                    <p className="text-sm text-muted-foreground" dir="rtl">
                      {attempt.student.full_name_ar}
                    </p>
                  </div>
                  {attempt.submitted_at ? (
                    <Badge className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t('student.quizCompleted')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t('teacher.notSubmitted')}
                    </Badge>
                  )}
                  {attempt.submitted_at && (
                    attempt.graded_at ? (
                      <Badge className="flex items-center gap-1 bg-green-600">
                        <CheckCircle className="w-3 h-3" />
                        {t('teacher.graded')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {t('teacher.notGraded')}
                      </Badge>
                    )
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('teacher.submittedAt')}</p>
                    <p className="font-medium">
                      {attempt.submitted_at
                        ? format(new Date(attempt.submitted_at), 'PPp')
                        : t('teacher.notSubmitted')}
                    </p>
                  </div>
                  {attempt.submitted_at && (
                    <div>
                      <p className="text-muted-foreground">{t('student.yourScore')}</p>
                      <p className="font-medium">
                        {attempt.score} / {attempt.total_points} {t('teacher.points')}
                      </p>
                    </div>
                  )}
                  {attempt.grade && (
                    <div>
                      <p className="text-muted-foreground">{t('teacher.grade')}</p>
                      <p className="font-medium">{attempt.grade}</p>
                    </div>
                  )}
                  {attempt.graded_at && (
                    <div>
                      <p className="text-muted-foreground">{t('teacher.gradedAt')}</p>
                      <p className="font-medium">
                        {format(new Date(attempt.graded_at), 'PPp')}
                      </p>
                    </div>
                  )}
                </div>

                {attempt.submitted_at && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate(`/teacher/quizzes/${quizId}/attempts/${attempt.id}`)}
                  >
                    {attempt.graded_at ? t('teacher.viewDetails') : t('teacher.gradeQuiz')}
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

export default QuizAttempts;
