import { X, Mail, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDataModal = ({ isOpen, onClose }: ExportDataModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleExport = (method: string) => {
    toast({
      title: t('admin.exportSuccess'),
      description: `${t('admin.exportSuccessDesc')} ${method}. (Demo mode)`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('admin.exportData')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => handleExport(t('admin.email'))} 
            variant="outline" 
            className="w-full justify-start"
          >
            <Mail className="w-4 h-4 mr-3" />
            {t('admin.shareToEmail')}
          </Button>

          <Button 
            onClick={() => handleExport("CSV")} 
            variant="outline" 
            className="w-full justify-start"
          >
            <Download className="w-4 h-4 mr-3" />
            {t('admin.downloadCSV')}
          </Button>

          <Button 
            onClick={() => handleExport("Google Drive")} 
            variant="outline" 
            className="w-full justify-start"
          >
            <Upload className="w-4 h-4 mr-3" />
            {t('admin.exportToGoogleDrive')}
          </Button>

          <Button onClick={onClose} variant="ghost" className="w-full mt-4">
            {t('common.cancel')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
