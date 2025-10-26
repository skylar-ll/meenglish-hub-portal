import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eraser, Pen } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  language: 'en' | 'ar';
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onSave, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with high resolution for crisp signature
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Set drawing style for smooth lines
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ('touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left);
    const y = ('touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left);
    const y = ('touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Pen className="w-4 h-4" />
          <p className="text-sm">
            {language === 'ar' 
              ? 'يرجى التوقيع أدناه للموافقة على الشروط والأحكام'
              : 'Please sign below to agree to the terms and conditions'}
          </p>
        </div>

        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-48 cursor-crosshair touch-none"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearSignature}
            disabled={!hasDrawn}
            className="flex-1"
          >
            <Eraser className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'مسح' : 'Clear'}
          </Button>
          <Button
            type="button"
            onClick={saveSignature}
            disabled={!hasDrawn}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            {language === 'ar' ? 'حفظ التوقيع' : 'Save Signature'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
