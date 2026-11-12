import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Subtitles,
  Sparkles,
  Film,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  DEMO_CHAPTERS,
  TOTAL_DEMO_DURATION,
  type DemoChapter,
} from '../../data/demoWalkthroughChapters';
import { getDashboardStats, getHistory } from '../../services/api';
import { renderDemoScene, type LiveDemoSnapshot } from './demoSceneRenderer';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export const DemoVideoPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const lastSpokenChapterRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveDemoSnapshot>({
    stats: null,
    latestJob: null,
    isLive: false,
  });

  // Hydrate with real backend data when available
  useEffect(() => {
    let active = true;
    Promise.allSettled([getDashboardStats(), getHistory(1, 5)]).then(([statsRes, histRes]) => {
      if (!active) return;
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const histItems =
        histRes.status === 'fulfilled' ? histRes.value?.items || histRes.value || [] : [];
      const latestJob = Array.isArray(histItems) && histItems.length > 0 ? histItems[0] : null;
      setSnapshot({
        stats,
        latestJob,
        isLive: Boolean(stats || latestJob),
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const currentChapterIndex = Math.max(
    0,
    DEMO_CHAPTERS.findIndex((c) => currentTime >= c.startSec && currentTime < c.endSec)
  );
  const currentChapter: DemoChapter =
    currentTime >= TOTAL_DEMO_DURATION
      ? DEMO_CHAPTERS[DEMO_CHAPTERS.length - 1]
      : DEMO_CHAPTERS[currentChapterIndex] || DEMO_CHAPTERS[0];

  const speakNarration = useCallback(
    (chapter: DemoChapter) => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(chapter.narration);
        utter.lang = 'en-US';
        utter.rate = Math.min(1.6, Math.max(0.75, speed));
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore speech synthesis errors on unsupported browsers
      }
    },
    [voiceEnabled, speed]
  );

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Render canvas frame (captions baked into canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDemoScene(ctx, canvas.width, canvas.height, currentTime, snapshot, showCaptions);
  }, [currentTime, snapshot, showCaptions]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameRef.current = performance.now();
    const tick = (now: number) => {
      const dt = ((now - lastFrameRef.current) / 1000) * speed;
      lastFrameRef.current = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= TOTAL_DEMO_DURATION) {
          setIsPlaying(false);
          return TOTAL_DEMO_DURATION;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed]);

  // Speak when chapter changes during playback
  useEffect(() => {
    if (!isPlaying) return;
    if (lastSpokenChapterRef.current !== currentChapter.id) {
      lastSpokenChapterRef.current = currentChapter.id;
      speakNarration(currentChapter);
    }
  }, [isPlaying, currentChapter, speakNarration]);

  const handleTogglePlay = () => {
    if (currentTime >= TOTAL_DEMO_DURATION) {
      setCurrentTime(0);
      lastSpokenChapterRef.current = null;
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      lastSpokenChapterRef.current = null;
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    lastSpokenChapterRef.current = null;
    setIsPlaying(true);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    lastSpokenChapterRef.current = null;
  };

  const jumpToChapter = (chap: DemoChapter) => {
    setCurrentTime(chap.startSec + 0.05);
    lastSpokenChapterRef.current = null;
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const stepChapter = (delta: -1 | 1) => {
    const nextIdx = Math.min(
      DEMO_CHAPTERS.length - 1,
      Math.max(0, currentChapterIndex + delta)
    );
    jumpToChapter(DEMO_CHAPTERS[nextIdx]);
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-[#1e3a5f] bg-[#111827] overflow-hidden shadow-xl"
    >
      {/* Top Bar */}
      <div className="px-5 py-3.5 border-b border-[#1e3a5f] flex flex-wrap items-center justify-between gap-3 bg-[#0d1322]">
        <div className="flex items-center gap-2.5">
          <Film className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">
            VerityAI Complete Walkthrough (5m 36s • 18 Chapters)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={currentChapter.routeHint}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 hover:text-cyan-300 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-full"
          >
            <span>Open {currentChapter.routeHint}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span>
              {snapshot.isLive ? 'Live Data Hydrated' : 'Illustrative Mode'}
            </span>
          </span>
        </div>
      </div>

      {/* Video Stage */}
      <div className="relative bg-[#0a0e1a] aspect-video w-full">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onClick={handleTogglePlay}
          className="w-full h-full block cursor-pointer"
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label="Play demo video"
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group"
          >
            <span className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
              <Play className="w-7 h-7 text-white fill-current ml-1" />
            </span>
          </button>
        )}
      </div>

      {/* Scrubber & Controls */}
      <div className="p-4 space-y-3 bg-[#0d1322] border-t border-[#1e3a5f]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-10">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={TOTAL_DEMO_DURATION}
            step={0.2}
            value={currentTime}
            onChange={handleScrub}
            aria-label="Video timeline"
            className="flex-1 accent-cyan-400 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
            {formatTime(TOTAL_DEMO_DURATION)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold min-h-[38px]"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>
                {isPlaying ? 'Pause' : currentTime >= TOTAL_DEMO_DURATION ? 'Replay' : 'Play'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => stepChapter(-1)}
              disabled={currentChapterIndex === 0}
              aria-label="Previous chapter"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs disabled:opacity-40 min-h-[38px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              type="button"
              onClick={() => stepChapter(1)}
              disabled={currentChapterIndex >= DEMO_CHAPTERS.length - 1}
              aria-label="Next chapter"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs disabled:opacity-40 min-h-[38px]"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              title="Change playback speed"
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 min-h-[36px]"
            >
              {speed}x
            </button>

            <button
              type="button"
              onClick={() => setShowCaptions((c) => !c)}
              title="Toggle captions"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium min-h-[36px] ${
                showCaptions
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Captions</span>
            </button>

            <button
              type="button"
              onClick={() => {
                lastSpokenChapterRef.current = null;
                if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setVoiceEnabled((v) => !v);
              }}
              title="Toggle voiceover narration"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium min-h-[36px] ${
                voiceEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
              aria-label="Toggle fullscreen"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium min-h-[36px]"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 18-Chapter Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 pt-2 border-t border-slate-800/80">
          {DEMO_CHAPTERS.map((chap) => {
            const isCurrent = chap.id === currentChapter.id;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => jumpToChapter(chap)}
                className={`px-2 py-1.5 rounded-md text-left text-[11px] font-medium transition-colors truncate ${
                  isCurrent
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
                title={chap.title}
              >
                {chap.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
