/**
 * Cross-platform PDF download helper
 * Works on iOS Safari, Android Chrome, and desktop browsers
 */
export const downloadPdfBlob = (pdfBlob: Blob, fileName: string): void => {
  const blobUrl = URL.createObjectURL(pdfBlob);
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  
  if (isIOS) {
    // iOS: Open in new tab - Safari will show native PDF viewer with share option
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      // If popup blocked, navigate directly
      window.location.href = blobUrl;
    }
    // Don't revoke immediately on iOS - let the viewer load
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } else if (isSafari) {
    // Desktop Safari
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      window.location.href = blobUrl;
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } else if (isAndroid) {
    // Android: Try download link first, fallback to new tab
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;';
    document.body.appendChild(link);
    
    // Click with timeout for Android compatibility
    setTimeout(() => {
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    }, 100);
  } else {
    // Desktop Chrome, Firefox, Edge
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(link);
    
    setTimeout(() => {
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 250);
    }, 100);
  }
};
