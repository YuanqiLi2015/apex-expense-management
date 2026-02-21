
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setCapturedImage(base64);
      setError(null);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ocr-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'OCR failed');
      }

      const ocrData = await response.json();

      // Navigate to review page with OCR data
      navigate('/review', {
        state: {
          scannedImage: base64Image,
          ocrData: {
            merchant: ocrData.merchant,
            amount: ocrData.amount,
            category: ocrData.category,
            date: ocrData.date,
            icon: ocrData.icon,
          }
        }
      });
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err.message || 'Failed to process receipt. Try again.');
      setProcessing(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setError(null);
    setProcessing(false);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 pt-12 pb-4">
        <div className="flex items-center justify-between h-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <h2 className="text-[14px] font-black tracking-tight text-white/80 uppercase">Scan Receipt</h2>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-6">
        {!capturedImage ? (
          /* Empty State — Prompt to capture */
          <div className="flex flex-col items-center text-center">
            {/* Animated scanner icon */}
            <div className="relative mb-10">
              <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center border border-[#D4AF37]/20">
                <span className="material-symbols-outlined text-[56px] text-[#D4AF37] fill-1">document_scanner</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg animate-pulse">
                <span className="material-symbols-outlined text-white text-[16px] fill-1">auto_awesome</span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Smart Receipt Scanner</h2>
            <p className="text-white/40 text-sm font-medium max-w-[260px] leading-relaxed mb-12">
              Take a photo of your receipt and AI will extract the details automatically
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 w-full max-w-[280px]">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-5 rounded-full bg-[#D4AF37] text-white font-black text-sm uppercase tracking-tight shadow-fab hover:bg-[#c4a130] transition-all active:scale-[0.97] flex items-center justify-start gap-4 px-10"
              >
                <div className="w-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px] fill-1">photo_camera</span>
                </div>
                Take Photo
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-5 rounded-full bg-white/10 backdrop-blur-md text-white font-black text-sm uppercase tracking-tight hover:bg-white/15 transition-all active:scale-[0.97] flex items-center justify-start gap-4 px-10 border border-white/10"
              >
                <div className="w-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">photo_library</span>
                </div>
                Choose from Gallery
              </button>
            </div>
          </div>
        ) : (
          /* Captured Image + Processing State */
          <div className="flex flex-col items-center w-full">
            <div className="relative w-full max-w-[320px] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className={`w-full object-contain max-h-[400px] ${processing ? 'opacity-50' : ''} transition-opacity`}
              />

              {/* Processing overlay */}
              {processing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-white font-black text-sm uppercase tracking-tight">Analyzing Receipt...</p>
                  <p className="text-white/50 text-xs mt-2">AI is extracting details</p>
                </div>
              )}

              {/* Scan line animation */}
              {processing && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-scan-line"></div>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-6 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 max-w-[320px]">
                <p className="text-red-400 text-sm font-bold text-center">{error}</p>
              </div>
            )}

            {/* Action buttons when not processing */}
            {!processing && (
              <div className="mt-8 flex flex-col gap-3 w-full max-w-[280px]">
                {error && (
                  <button
                    onClick={() => processImage(capturedImage)}
                    className="w-full py-4 rounded-full bg-[#D4AF37] text-white font-black text-sm uppercase tracking-tight shadow-fab active:scale-[0.97] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                    Retry
                  </button>
                )}
                <button
                  onClick={resetCapture}
                  className="w-full py-4 rounded-full bg-white/10 text-white font-black text-sm uppercase tracking-tight active:scale-[0.97] flex items-center justify-center gap-2 border border-white/10"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  Retake Photo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom safe area */}
      <div className="h-12"></div>

      {/* Custom scan line animation */}
      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Scan;
