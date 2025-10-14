import { useState } from "react";
import { X, Plus, Trash2, Upload, Image, Video, Music, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

type QuestionType = "multiple-choice" | "long-answer" | "image" | "video" | "audio";

interface Question {
  id: number;
  type: QuestionType;
  text: string;
  answers: string[];
  correctAnswerIndex?: number;
  mediaUrl?: string;
  mediaFile?: File;
  points: number;
}

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateQuizModal = ({ isOpen, onClose }: CreateQuizModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: 1, type: "multiple-choice", text: "", answers: ["", "", "", ""], correctAnswerIndex: 0, points: 1 }
  ]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set());

  const addQuestion = () => {
    const newId = questions.length + 1;
    setQuestions([
      ...questions,
      { id: newId, type: "multiple-choice", text: "", answers: ["", "", "", ""], correctAnswerIndex: 0, points: 1 }
    ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: number, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const updateQuestionType = (id: number, type: QuestionType) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        // Reset answers based on type
        if (type === "multiple-choice") {
          return { ...q, type, answers: ["", "", "", ""], correctAnswerIndex: 0 };
        } else if (type === "long-answer") {
          return { ...q, type, answers: [], correctAnswerIndex: undefined };
        } else {
          return { ...q, type, answers: [], correctAnswerIndex: undefined };
        }
      }
      return q;
    }));
  };

  const updateAnswer = (questionId: number, answerIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, answers: q.answers.map((a, i) => i === answerIndex ? value : a) }
        : q
    ));
  };

  const updateCorrectAnswer = (questionId: number, answerIndex: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, correctAnswerIndex: answerIndex } : q
    ));
  };

  const updatePoints = (questionId: number, points: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, points: Math.max(1, points) } : q
    ));
  };

  const handleFileUpload = async (questionId: number, file: File) => {
    setUploadingFiles(prev => new Set(prev).add(questionId));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('quiz-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('quiz-media')
        .getPublicUrl(filePath);

      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, mediaUrl: publicUrl, mediaFile: file } : q
      ));

      toast({
        title: t('teacher.fileUploaded'),
        description: file.name,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const removeMedia = (questionId: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, mediaUrl: undefined, mediaFile: undefined } : q
    ));
  };

  const handleSave = () => {
    // Validation
    if (!quizTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a quiz title",
        variant: "destructive",
      });
      return;
    }

    for (const q of questions) {
      if (!q.text.trim()) {
        toast({
          title: "Error",
          description: `Please enter text for question ${q.id}`,
          variant: "destructive",
        });
        return;
      }

      if (q.type === "multiple-choice") {
        const filledAnswers = q.answers.filter(a => a.trim());
        if (filledAnswers.length < 2) {
          toast({
            title: "Error",
            description: `Question ${q.id} needs at least 2 answers`,
            variant: "destructive",
          });
          return;
        }
      }

      if ((q.type === "image" || q.type === "video" || q.type === "audio") && !q.mediaUrl) {
        toast({
          title: "Error",
          description: `Please upload a file for question ${q.id}`,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: t('teacher.quizCreated'),
      description: `${t('teacher.quizCreatedDesc')}`,
    });
    onClose();
  };

  const getQuestionIcon = (type: QuestionType) => {
    switch (type) {
      case "multiple-choice": return <FileText className="w-4 h-4" />;
      case "long-answer": return <FileText className="w-4 h-4" />;
      case "image": return <Image className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "audio": return <Music className="w-4 h-4" />;
    }
  };

  const getAcceptedFileTypes = (type: QuestionType) => {
    switch (type) {
      case "image": return "image/*";
      case "video": return "video/*";
      case "audio": return "audio/*";
      default: return "*";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 p-6">
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
            <Label>{t('teacher.numberOfQuestions')}: {questions.length}</Label>
          </div>

          {questions.map((question, qIndex) => (
            <Card key={question.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <Label className="text-lg font-semibold">{t('teacher.question')} {qIndex + 1}</Label>
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

              <div className="space-y-4">
                <div>
                  <Label>{t('teacher.questionType')}</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value) => updateQuestionType(question.id, value as QuestionType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {t('teacher.multipleChoice')}
                        </div>
                      </SelectItem>
                      <SelectItem value="long-answer">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {t('teacher.longAnswer')}
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          {t('teacher.imageQuestion')}
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          {t('teacher.videoQuestion')}
                        </div>
                      </SelectItem>
                      <SelectItem value="audio">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4" />
                          {t('teacher.audioQuestion')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('teacher.questionText')}</Label>
                  <Textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, e.target.value)}
                    placeholder={t('teacher.questionText')}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <Label>{t('teacher.points')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={question.points}
                      onChange={(e) => updatePoints(question.id, parseInt(e.target.value) || 1)}
                      placeholder={t('teacher.pointsPlaceholder')}
                    />
                  </div>
                </div>

                {(question.type === "image" || question.type === "video" || question.type === "audio") && (
                  <div>
                    <Label className="flex items-center gap-2">
                      {getQuestionIcon(question.type)}
                      {t('teacher.uploadFile')}
                    </Label>
                    {!question.mediaUrl ? (
                      <div className="mt-2">
                        <input
                          type="file"
                          accept={getAcceptedFileTypes(question.type)}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(question.id, file);
                          }}
                          className="hidden"
                          id={`file-upload-${question.id}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById(`file-upload-${question.id}`)?.click()}
                          disabled={uploadingFiles.has(question.id)}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingFiles.has(question.id) ? t('teacher.uploading') : t('teacher.uploadFile')}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <div className="border rounded-md p-4 space-y-3">
                          {question.type === "image" && question.mediaUrl && (
                            <img src={question.mediaUrl} alt="Question" className="max-h-48 rounded" />
                          )}
                          {question.type === "video" && question.mediaUrl && (
                            <video src={question.mediaUrl} controls className="max-h-48 rounded w-full" />
                          )}
                          {question.type === "audio" && question.mediaUrl && (
                            <audio src={question.mediaUrl} controls className="w-full" />
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {question.mediaFile?.name || "File uploaded"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMedia(question.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {question.type === "multiple-choice" && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t('teacher.answers')}</Label>
                    {question.answers.map((answer, aIndex) => (
                      <div key={aIndex} className="flex gap-2 items-center">
                        <Button
                          type="button"
                          variant={question.correctAnswerIndex === aIndex ? "default" : "outline"}
                          size="icon"
                          onClick={() => updateCorrectAnswer(question.id, aIndex)}
                          className="shrink-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Input
                          value={answer}
                          onChange={(e) => updateAnswer(question.id, aIndex, e.target.value)}
                          placeholder={`${t('teacher.answer')} ${aIndex + 1}`}
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {t('teacher.markCorrect')}
                    </p>
                  </div>
                )}

                {question.type === "long-answer" && (
                  <div className="bg-muted/30 rounded p-3">
                    <p className="text-sm text-muted-foreground">
                      Students will provide a written essay response to this question.
                    </p>
                  </div>
                )}
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
