import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  correct_answer_index: number | null;
  points: number;
  media_url: string | null;
  options: Array<{ option_text: string; option_order: number }>;
  student_answer: {
    id: string;
    selected_option_index: number | null;
    text_answer: string | null;
    teacher_feedback: string | null;
    points_awarded: number | null;
  } | null;
}

const QuizAttemptDetail = () => {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [studentName, setStudentName] = useState("");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grade, setGrade] = useState("");
  const [overallFeedback, setOverallFeedback] = useState("");
  const [questionFeedbacks, setQuestionFeedbacks] = useState<Record<string, string>>({});
  const [pointsAwarded, setPointsAwarded] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId, quizId]);

  const fetchAttemptDetails = async () => {
    try {
      // Fetch attempt with student info
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('submitted_at, grade, teacher_feedback, student_id')
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Fetch student profile separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name_en, full_name_ar')
        .eq('id', attemptData.student_id)
        .single();

      if (profileError) throw profileError;

      setSubmittedAt(attemptData.submitted_at);
      setGrade(attemptData.grade || "");
      setOverallFeedback(attemptData.teacher_feedback || "");
      setStudentName(profileData?.full_name_en || 'Unknown');

      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('title')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      setQuizTitle(quizData.title);

      // Fetch questions with options and student answers
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          question_text,
          question_type,
          correct_answer_index,
          points,
          media_url,
          quiz_question_options (
            option_text,
            option_order
          )
        `)
        .eq('quiz_id', quizId)
        .order('question_order');

      if (questionsError) throw questionsError;

      // Fetch student answers
      const { data: answersData, error: answersError } = await supabase
        .from('student_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (answersError) throw answersError;

      // Combine data
      const combinedQuestions = questionsData.map((q: any) => {
        const answer = answersData?.find(a => a.question_id === q.id);
        return {
          ...q,
          options: q.quiz_question_options || [],
          student_answer: answer || null
        };
      });

      setQuestions(combinedQuestions);

      // Initialize feedback states
      const feedbacks: Record<string, string> = {};
      const points: Record<string, number> = {};
      combinedQuestions.forEach(q => {
        if (q.student_answer) {
          feedbacks[q.id] = q.student_answer.teacher_feedback || "";
          points[q.id] = q.student_answer.points_awarded ?? q.points;
        }
      });
      setQuestionFeedbacks(feedbacks);
      setPointsAwarded(points);
    } catch (error) {
      console.error('Error fetching attempt details:', error);
      toast({
        title: t('common.error'),
        description: "Failed to load quiz attempt details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update quiz attempt
      const { error: attemptError } = await supabase
        .from('quiz_attempts')
        .update({
          grade,
          teacher_feedback: overallFeedback,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        })
        .eq('id', attemptId);

      if (attemptError) throw attemptError;

      // Update student answers with feedback and points
      for (const question of questions) {
        if (question.student_answer) {
          const { error: answerError } = await supabase
            .from('student_answers')
            .update({
              teacher_feedback: questionFeedbacks[question.id] || null,
              points_awarded: pointsAwarded[question.id]
            })
            .eq('id', question.student_answer.id);

          if (answerError) throw answerError;
        }
      }

      toast({
        title: t('common.success'),
        description: "Quiz graded successfully"
      });

      navigate(`/teacher/quizzes/${quizId}`);
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: t('common.error'),
        description: "Failed to save grade",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
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
          onClick={() => navigate(`/teacher/quizzes/${quizId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
          {quizTitle}
        </h1>
        <p className="text-muted-foreground mb-2">{studentName}</p>
        {submittedAt && (
          <p className="text-sm text-muted-foreground mb-8">
            {t('teacher.submittedAt')}: {format(new Date(submittedAt), 'PPp')}
          </p>
        )}

        <div className="space-y-6 mb-8">
          {questions.map((question, index) => (
            <Card key={question.id} className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  {t('teacher.question')} {index + 1} ({question.points} {t('teacher.points')})
                </h3>
                <p className="mb-2">{question.question_text}</p>
                
                {question.media_url && (
                  <div className="my-4">
                    {question.question_type === 'video' && (
                      <video controls className="max-w-full rounded-lg">
                        <source src={question.media_url} />
                      </video>
                    )}
                    {question.question_type === 'audio' && (
                      <audio controls className="w-full">
                        <source src={question.media_url} />
                      </audio>
                    )}
                    {question.question_type === 'image' && (
                      <img src={question.media_url} alt="Question" className="max-w-full rounded-lg" />
                    )}
                  </div>
                )}

                {question.question_type === 'multiple-choice' && (
                  <div className="space-y-2 mt-4">
                    {question.options.map((option) => {
                      const isCorrect = option.option_order === question.correct_answer_index;
                      const isSelected = question.student_answer?.selected_option_index === option.option_order;
                      
                      return (
                        <div
                          key={option.option_order}
                          className={`p-3 rounded-lg border ${
                            isSelected && isCorrect
                              ? 'bg-green-50 border-green-500'
                              : isSelected && !isCorrect
                              ? 'bg-red-50 border-red-500'
                              : isCorrect
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option.option_text}</span>
                            {isSelected && (
                              isCorrect ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            {!isSelected && isCorrect && (
                              <span className="text-sm text-blue-600">(Correct Answer)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.question_type === 'long-answer' && question.student_answer?.text_answer && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">{t('student.studentAnswer')}:</p>
                    <p className="whitespace-pre-wrap">{question.student_answer.text_answer}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 mt-4 pt-4 border-t">
                <div>
                  <Label htmlFor={`points-${question.id}`}>{t('teacher.pointsAwarded')}</Label>
                  <Input
                    id={`points-${question.id}`}
                    type="number"
                    min="0"
                    max={question.points}
                    value={pointsAwarded[question.id] || 0}
                    onChange={(e) => setPointsAwarded({
                      ...pointsAwarded,
                      [question.id]: parseInt(e.target.value) || 0
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`feedback-${question.id}`}>{t('teacher.questionFeedback')}</Label>
                  <Textarea
                    id={`feedback-${question.id}`}
                    value={questionFeedbacks[question.id] || ""}
                    onChange={(e) => setQuestionFeedbacks({
                      ...questionFeedbacks,
                      [question.id]: e.target.value
                    })}
                    placeholder={t('teacher.questionFeedback')}
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">{t('teacher.gradeQuiz')}</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="grade">{t('teacher.grade')}</Label>
              <Input
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="A+, B, 95%, etc."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="feedback">{t('teacher.feedback')}</Label>
              <Textarea
                id="feedback"
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder={t('teacher.feedback')}
                rows={4}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSaveGrade} disabled={saving} className="w-full">
              {saving ? t('common.loading') : t('teacher.saveGrade')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QuizAttemptDetail;
