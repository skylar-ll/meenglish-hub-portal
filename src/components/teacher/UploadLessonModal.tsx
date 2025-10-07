import { useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface UploadLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadLessonModal = ({ isOpen, onClose }: UploadLessonModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [lessonTitle, setLessonTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadedLessons, setUploadedLessons] = useState<string[]>([
    "Lesson 1 – English Grammar Basics.pdf",
    "Lesson 2 – Vocabulary Practice.docx",
    "Lesson 3 – Listening Skills.mp4"
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleUpload = () => {
    if (!lessonTitle || !fileName) {
      toast({
        title: t('teacher.error'),
        description: t('teacher.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    const newLesson = `${lessonTitle} – ${fileName}`;
    setUploadedLessons([...uploadedLessons, newLesson]);
    
    toast({
      title: t('teacher.lessonUploaded'),
      description: `${t('teacher.lessonUploadedDesc')} "${lessonTitle}" (Demo mode)`,
    });

    setLessonTitle("");
    setFileName("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('teacher.uploadLessons')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="lessonTitle">{t('teacher.lessonTitle')}</Label>
            <Input
              id="lessonTitle"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder={t('teacher.lessonTitlePlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="fileUpload">{t('teacher.selectFile')}</Label>
            <div className="flex gap-2">
              <Input
                id="fileUpload"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3"
              />
            </div>
            {fileName && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('teacher.selectedFile')}: {fileName}
              </p>
            )}
          </div>

          <Button onClick={handleUpload} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            {t('teacher.uploadLesson')}
          </Button>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">{t('teacher.uploadedLessons')}</h3>
            <div className="space-y-2">
              {uploadedLessons.map((lesson, index) => (
                <Card key={index} className="p-3 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm">{lesson}</span>
                </Card>
              ))}
            </div>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            {t('common.close')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
