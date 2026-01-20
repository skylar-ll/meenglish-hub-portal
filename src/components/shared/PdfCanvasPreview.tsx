import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// PDF.js (pdfjs-dist)
import * as pdfjs from "pdfjs-dist";
// In Vite, the worker can be referenced as a URL via ?url
// (pdfjs-dist v4+ ships ESM worker as .mjs)
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Props = {
  blob: Blob;
  className?: string;
};

export default function PdfCanvasPreview({ blob, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTokenRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  const blobKey = useMemo(() => `${blob.size}-${blob.type}`, [blob]);

  useEffect(() => {
    let isActive = true;
    const token = ++renderTokenRef.current;

    const render = async () => {
      try {
        setError(null);
        const data = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;

        if (!isActive || token !== renderTokenRef.current) return;

        const page = await pdf.getPage(1);
        if (!isActive || token !== renderTokenRef.current) return;

        const containerWidth = containerRef.current?.clientWidth ?? 800;
        const viewportAt1 = page.getViewport({ scale: 1 });
        const scale = Math.max(0.5, Math.min(3, containerWidth / viewportAt1.width));
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // High-DPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      } catch (e: any) {
        console.error("PDF preview render error:", e);
        if (!isActive) return;
        setError(e?.message || "Failed to render PDF preview");
      }
    };

    render();

    const ro = new ResizeObserver(() => {
      // Re-render on container resize to fit width
      render();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      isActive = false;
      ro.disconnect();
    };
  }, [blob, blobKey]);

  if (error) {
    return (
      <div className={cn("p-4 text-sm text-muted-foreground", className)}>
        {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("w-full flex justify-center p-4", className)}>
      <canvas ref={canvasRef} className="max-w-full h-auto" />
    </div>
  );
}
