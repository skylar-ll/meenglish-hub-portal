import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Question {
  id: number;
  text: string;
  answers: string[];
}

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateQuizModal = ({ isOpen, onClose }: CreateQuizModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [quizTitle, setQuizTitle] = useState("");
  const [numQuestions, setNumQuestions] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([
    { id: 1, text: "", answers: ["", "", "", ""] }
  ]);

  const addQuestion = () => {
    const newId = questions.length + 1;
    setQuestions([...questions, { id: newId, text: "", answers: ["", "", "", ""] }]);
    setNumQuestions(newId);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
    setNumQuestions(questions.length - 1);
  };

  const updateQuestion = (id: number, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const updateAnswer = (questionId: number, answerIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, answers: q.answers.map((a, i) => i === answerIndex ? value : a) }
        : q
    ));
  };

  const handleSave = () => {
    toast({
      title: t('teacher.quizCreated'),
      description: `${t('teacher.quizCreatedDesc')} (Demo mode)`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('teacher.createQuiz')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="quizTitle">{t('teacher.quizTitle')}</Label>
            <Input
              id="quizTitle"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder={t('teacher.quizTitlePlaceholder')}
            />
          </div>

          <div>
            <Label>{t('teacher.numberOfQuestions')}: {numQuestions}</Label>
          </div>

          {questions.map((question, qIndex) => (
            <Card key={question.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <Label>{t('teacher.question')} {qIndex + 1}</Label>
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(question.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              
              <Input
                value={question.text}
                onChange={(e) => updateQuestion(question.id, e.target.value)}
                placeholder={t('teacher.questionText')}
                className="mb-3"
              />

              <div className="space-y-2">
                <Label className="text-sm">{t('teacher.answers')}</Label>
                {question.answers.map((answer, aIndex) => (
                  <Input
                    key={aIndex}
                    value={answer}
                    onChange={(e) => updateAnswer(question.id, aIndex, e.target.value)}
                    placeholder={`${t('teacher.answer')} ${aIndex + 1}`}
                  />
                ))}
              </div>
            </Card>
          ))}

          <Button onClick={addQuestion} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {t('teacher.addQuestion')}
          </Button>

          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1">
              {t('teacher.saveQuiz')}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
