import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuizQuestion {
  id: string;
  question_type: string;
  question_text: string;
  media_url: string | null;
  points: number;
  correct_answer_index: number | null;
  question_order: number;
  options: Array<{
    id: string;
    option_text: string;
    option_order: number;
  }>;
}

interface Answer {
  question_id: string;
  selected_option_index?: number;
  text_answer?: string;
}

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizAndQuestions();
  }, [quizId]);

  const fetchQuizAndQuestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('title, total_points')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      setQuizTitle(quizData.title);

      // Check for existing attempt
      let { data: attemptData } = await supabase
        .from('quiz_attempts')
        .select('id, submitted_at')
        .eq('quiz_id', quizId)
        .eq('student_id', user.id)
        .maybeSingle();

      // If no attempt exists or it's submitted, create new attempt
      if (!attemptData || attemptData.submitted_at) {
        const { data: newAttempt, error: attemptError } = await supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: quizId,
            student_id: user.id,
            total_points: quizData.total_points
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        attemptData = newAttempt;
      }

      setAttemptId(attemptData.id);

      // Fetch questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          question_type,
          question_text,
          media_url,
          points,
          correct_answer_index,
          question_order,
          quiz_question_options (
            id,
            option_text,
            option_order
          )
        `)
        .eq('quiz_id', quizId)
        .order('question_order');

      if (questionsError) throw questionsError;

      const transformedQuestions = questionsData.map((q: any) => ({
        id: q.id,
        question_type: q.question_type,
        question_text: q.question_text,
        media_url: q.media_url,
        points: q.points,
        correct_answer_index: q.correct_answer_index,
        question_order: q.question_order,
        options: q.quiz_question_options || []
      }));

      setQuestions(transformedQuestions);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    if (question.question_type === 'multiple-choice') {
      setAnswers({
        ...answers,
        [questionId]: {
          question_id: questionId,
          selected_option_index: value as number
        }
      });
    } else {
      setAnswers({
        ...answers,
        [questionId]: {
          question_id: questionId,
          text_answer: value as string
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;

    setSubmitting(true);
    try {
      // Calculate score for multiple choice questions
      let score = 0;
      const answerRecords = [];

      for (const question of questions) {
        const answer = answers[question.id];
        
        if (question.question_type === 'multiple-choice' && answer?.selected_option_index !== undefined) {
          // Check if answer is correct
          if (answer.selected_option_index === question.correct_answer_index) {
            score += question.points;
          }

          answerRecords.push({
            attempt_id: attemptId,
            question_id: question.id,
            selected_option_index: answer.selected_option_index
          });
        } else if (answer?.text_answer) {
          answerRecords.push({
            attempt_id: attemptId,
            question_id: question.id,
            text_answer: answer.text_answer
          });
        }
      }

      // Save answers
      if (answerRecords.length > 0) {
        const { error: answersError } = await supabase
          .from('student_answers')
          .insert(answerRecords);

        if (answersError) throw answersError;
      }

      // Update attempt with submission time and score
      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          score: score
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      toast.success(t('student.quizSubmitted'), {
        description: t('student.quizSubmittedDesc')
      });

      navigate('/student/quizzes');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error("Failed to submit quiz");
    } finally {
      setSubmitting(false);
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
      <div className="container max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/student/quizzes")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
          {quizTitle}
        </h1>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id} className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  {t('teacher.question')} {index + 1} ({question.points} {t('teacher.points')})
                </h3>
                <p className="text-muted-foreground mb-4">{question.question_text}</p>

                {question.media_url && (
                  <div className="mb-4">
                    {question.question_type === 'image' && (
                      <img src={question.media_url} alt="Question" className="max-h-64 rounded" />
                    )}
                    {question.question_type === 'video' && (
                      <video src={question.media_url} controls className="max-h-64 rounded w-full" />
                    )}
                    {question.question_type === 'audio' && (
                      <audio src={question.media_url} controls className="w-full" />
                    )}
                  </div>
                )}
              </div>

              {question.question_type === 'multiple-choice' ? (
                <RadioGroup
                  value={answers[question.id]?.selected_option_index?.toString()}
                  onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                >
                  {question.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value={option.option_order.toString()} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea
                  value={answers[question.id]?.text_answer || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder={t('student.writeAnswer')}
                  className="min-h-[120px]"
                />
              )}
            </Card>
          ))}
        </div>

        <div className="mt-8 flex gap-4">
          <Button
            onClick={() => setShowConfirmDialog(true)}
            className="flex-1"
            disabled={submitting || Object.keys(answers).length === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {submitting ? t('common.loading') : t('student.submitQuiz')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/student/quizzes")}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('student.confirmSubmit')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('student.cannotChangeAnswers')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              {t('student.submitQuiz')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeQuiz;
