import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { CreateQuizModal } from "@/components/teacher/CreateQuizModal";
import { format } from "date-fns";

interface Quiz {
  id: string;
  title: string;
  total_points: number;
  created_at: string;
  attempts_count: number;
}

const TeacherQuizzes = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          total_points,
          created_at
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get attempt counts for each quiz
      const quizzesWithCounts = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          const { count } = await supabase
            .from('quiz_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);

          return {
            ...quiz,
            attempts_count: count || 0
          };
        })
      );

      setQuizzes(quizzesWithCounts);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizCreated = () => {
    setIsCreateModalOpen(false);
    fetchQuizzes();
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/teacher/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('teacher.backHome')}
            </Button>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              {t('teacher.myQuizzes')}
            </h1>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('teacher.createQuiz')}
          </Button>
        </div>

        {quizzes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">{t('teacher.noQuizzes')}</h3>
            <p className="text-muted-foreground mb-6">{t('teacher.createFirstQuiz')}</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('teacher.createQuiz')}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="p-6 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/teacher/quizzes/${quiz.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('common.created')}: {format(new Date(quiz.created_at), 'PPP')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {quiz.total_points} {t('teacher.points')}
                  </Badge>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {quiz.attempts_count} {t('teacher.attempts')}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateQuizModal
        isOpen={isCreateModalOpen}
        onClose={handleQuizCreated}
      />
    </div>
  );
};

export default TeacherQuizzes;
