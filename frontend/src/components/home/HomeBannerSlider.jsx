import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CountdownTimer from "./CountdownTimer.jsx";

const SWIPE_DISTANCE = 50;

const HomeBannerSlider = ({ ads }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const advanceTimerRef = useRef(null);

  const prevIndex = useMemo(
    () => (currentIndex === 0 ? ads.length - 1 : currentIndex - 1),
    [currentIndex, ads.length],
  );
  const nextIndex = useMemo(
    () => (currentIndex === ads.length - 1 ? 0 : currentIndex + 1),
    [currentIndex, ads.length],
  );
  const adjacentImages = useMemo(() => {
    if (!ads || ads.length === 0) return [];
    return ads
      .filter((_, i) => i === prevIndex || i === nextIndex)
      .map((ad) => ad.imageUrl)
      .filter(Boolean);
  }, [ads, prevIndex, nextIndex]);

  const advance = (dir = 1) => {
    setCurrentIndex((prev) => {
      if (dir === 1) return prev === ads.length - 1 ? 0 : prev + 1;
      return prev === 0 ? ads.length - 1 : prev - 1;
    });
  };

  const goToPrev = () => advance(-1);
  const goToNext = () => advance();

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > SWIPE_DISTANCE) goToNext();
    else if (distance < -SWIPE_DISTANCE) goToPrev();
  };

  useEffect(() => {
    if (!ads || ads.length === 0) return;
    setRevealedSteps(0);
    const t1 = setTimeout(() => setRevealedSteps(1), 0);
    const t2 = setTimeout(() => setRevealedSteps(2), 600);
    const t3 = setTimeout(() => setRevealedSteps(3), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [ads?.length, currentIndex]);

  useEffect(() => {
    if (!ads || ads.length === 0 || isHovered) return;
    clearInterval(advanceTimerRef.current);
    advanceTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev === ads.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(advanceTimerRef.current);
  }, [ads?.length, isHovered]);

  useEffect(() => {
    if (!lightboxImg) return;
    const handler = (e) => { if (e.key === "Escape") setLightboxImg(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxImg]);

  if (!ads || ads.length === 0) return null;

  return (
    <div
      className="relative w-full group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-label="Promotional banner slider"
    >
      {/* Preload adjacent images for instant navigation */}
      {adjacentImages.map((url, i) => (
        <link key={i} rel="prefetch" as="image" href={url} />
      ))}

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative w-full">
        <div className="relative w-full pt-[45%] md:pt-[36%] lg:pt-[28%]">
          {ads.map((ad, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                index === currentIndex
                  ? "opacity-100 scale-100 z-10"
                  : "opacity-0 scale-110 z-0 pointer-events-none"
              }`}
            >
              <div className="relative w-full h-full overflow-hidden bg-slate-800">
                {ad.mediaType === "video" ? (
                  <video
                    src={ad.videoUrl}
                    className="w-full h-full object-cover"
                    autoPlay={index === currentIndex}
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={ad.imageUrl}
                    className={`w-full h-full object-cover transition-transform duration-[10000ms] ${
                      index === currentIndex ? "scale-105" : "scale-100"
                    }`}
                    alt={ad.title || `Promotion ${index + 1}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchpriority={index === currentIndex ? "high" : "low"}
                  />
                )}

                {/* Overlay hidden on hover */}
                <div className={`absolute inset-0 transition-all duration-[800ms] ease-in-out ${index === currentIndex && !isHovered ? "bg-gradient-to-t from-black/40 via-black/10 to-transparent" : "bg-transparent"}`} />

                {/* Clickable area for lightbox */}
                <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setLightboxImg(ad.imageUrl)} />

                {ad.endDate && new Date(ad.endDate) > new Date() && (
                  <CountdownTimer
                    endDate={ad.endDate}
                    countdownText={ad.countdownText || "Sale Ends In:"}
                    isActive={ad.status === "active"}
                  />
                )}
              </div>

              {/* Centered overlay with sequential text reveal */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 sm:px-6 md:px-10 lg:px-14 text-center cursor-pointer" onClick={() => setLightboxImg(ad.imageUrl)}>
                {index === currentIndex && (
                  <>
                    <h2 className={`text-white font-bold tracking-tight drop-shadow-2xl max-w-4xl text-[clamp(1.125rem,4.5vw,3rem)] leading-[1.1] transition-all duration-[800ms] ease-in-out ${revealedSteps >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                      {ad.title}
                    </h2>
                    {ad.description && (
                      <p className={`text-white/90 mt-1 sm:mt-2 max-w-2xl leading-relaxed drop-shadow-lg text-[clamp(0.75rem,2vw,1.125rem)] transition-all duration-[800ms] ease-in-out ${revealedSteps >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                        {ad.description}
                      </p>
                    )}
                    {ad.buttonText && (
                      <button onClick={(e) => e.stopPropagation()} className={`mt-2 sm:mt-3 md:mt-4 px-5 sm:px-6 md:px-8 py-1.5 sm:py-2 md:py-2.5 bg-white text-slate-900 text-[clamp(0.75rem,1.5vw,0.875rem)] font-semibold uppercase tracking-wider rounded-full hover:bg-white/90 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-[800ms] ease-in-out ${revealedSteps >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                        <span className="flex items-center gap-2">
                          {ad.buttonText}
                          <ChevronRight className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 z-20 pointer-events-none">
        <button
          onClick={goToPrev}
          aria-label="Previous slide"
          className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 shadow-lg hover:scale-110 active:scale-95 border border-white/20"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>
        <button
          onClick={goToNext}
          aria-label="Next slide"
          className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 shadow-lg hover:scale-110 active:scale-95 border border-white/20"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-0 right-0 flex justify-center items-center gap-2 sm:gap-3 z-20">
        {ads.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`transition-all duration-300 rounded-full ${
              i === currentIndex
                ? "w-6 sm:w-8 h-1.5 sm:h-2 bg-gradient-to-r from-white to-white/80"
                : "w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:hidden z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1 border border-white/20">
          <span className="text-white text-xs font-semibold">
            {String(currentIndex + 1).padStart(2, "0")}/
            {String(ads.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setLightboxImg(null)}>
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition text-2xl z-10">&times;</button>
          <img src={lightboxImg} alt="" className="max-w-[95vw] max-h-[95vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default HomeBannerSlider;
