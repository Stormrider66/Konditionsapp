"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { ProAgilityAnimation } from "@/remotion/agility/compositions/ProAgilityAnimation";
import { TTestAnimation } from "@/remotion/agility/compositions/TTestAnimation";
import { IllinoisAgilityAnimation } from "@/remotion/agility/compositions/IllinoisAgilityAnimation";
import { BoxDrillAnimation } from "@/remotion/agility/compositions/BoxDrillAnimation";
import { LDrillAnimation } from "@/remotion/agility/compositions/LDrillAnimation";
import { SprintAnimation } from "@/remotion/agility/compositions/SprintAnimation";
import { ArrowheadAnimation } from "@/remotion/agility/compositions/ArrowheadAnimation";
import { WDrillAnimation } from "@/remotion/agility/compositions/WDrillAnimation";
import { StarDrillAnimation } from "@/remotion/agility/compositions/StarDrillAnimation";
import { ConeZigZagAnimation } from "@/remotion/agility/compositions/ConeZigZagAnimation";
import { LadderDrillAnimation } from "@/remotion/agility/compositions/LadderDrillAnimation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface DrillAnimationPlayerProps {
  drillId: string;
  drillName: string;
  athleteTime?: number;
  benchmarkTier?: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Base props that all animation components accept
interface BaseAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
  [key: string]: unknown;
}

// Animation component type - using generic to allow any animation component
type AnimationComponent = React.ComponentType<BaseAnimationProps>;

// Map drill names to animation components and their settings
type AnimationConfig = {
  component: AnimationComponent;
  durationInFrames: number;
  defaultTime: number;
  extraProps?: Record<string, unknown>;
};

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

// Function to detect which animation to use based on drill name
function getAnimationConfig(drillName: string): AnimationConfig | null {
  const normalizedName = drillName.toLowerCase();

  // 5-10-5 Pro Agility
  if (normalizedName.includes("5-10-5") || normalizedName.includes("pro agility")) {
    return {
      component: ProAgilityAnimation as AnimationComponent,
      durationInFrames: 360,
      defaultTime: 4.5,
    };
  }

  // T-Test
  if (normalizedName.includes("t-test") || normalizedName === "t test") {
    return {
      component: TTestAnimation as AnimationComponent,
      durationInFrames: 420,
      defaultTime: 9.5,
    };
  }

  // Illinois Agility Test
  if (normalizedName.includes("illinois")) {
    return {
      component: IllinoisAgilityAnimation as AnimationComponent,
      durationInFrames: 400,
      defaultTime: 15.2,
    };
  }

  // Box Drill
  if (normalizedName.includes("box drill") || normalizedName.includes("rutövning")) {
    return {
      component: BoxDrillAnimation as AnimationComponent,
      durationInFrames: 300,
      defaultTime: 8.0,
    };
  }

  // L-Drill (3 Cone Drill)
  if (normalizedName.includes("l-drill") || normalizedName.includes("3 cone") || normalizedName.includes("3-kon")) {
    return {
      component: LDrillAnimation as AnimationComponent,
      durationInFrames: 400,
      defaultTime: 7.0,
    };
  }

  // 10m Sprint
  if (normalizedName.includes("10m sprint") || normalizedName.includes("10 m sprint")) {
    return {
      component: SprintAnimation as unknown as AnimationComponent,
      durationInFrames: 200,
      defaultTime: 1.8,
      extraProps: { distance: 10 },
    };
  }

  // 20m Sprint
  if (normalizedName.includes("20m sprint") || normalizedName.includes("20 m sprint")) {
    return {
      component: SprintAnimation as unknown as AnimationComponent,
      durationInFrames: 240,
      defaultTime: 3.0,
      extraProps: { distance: 20 },
    };
  }

  // 40m Sprint
  if (normalizedName.includes("40m sprint") || normalizedName.includes("40 m sprint")) {
    return {
      component: SprintAnimation as unknown as AnimationComponent,
      durationInFrames: 300,
      defaultTime: 5.2,
      extraProps: { distance: 40 },
    };
  }

  // Arrowhead Agility Test
  if (normalizedName.includes("arrowhead") || normalizedName.includes("pilspets")) {
    return {
      component: ArrowheadAnimation as AnimationComponent,
      durationInFrames: 300,
      defaultTime: 8.5,
    };
  }

  // W-Drill
  if (normalizedName.includes("w-drill") || normalizedName.includes("w-övning") || normalizedName === "w drill") {
    return {
      component: WDrillAnimation as AnimationComponent,
      durationInFrames: 310,
      defaultTime: 7.5,
    };
  }

  // Star Drill
  if (normalizedName.includes("star drill") || normalizedName.includes("stjärn") || normalizedName.includes("star agility")) {
    return {
      component: StarDrillAnimation as AnimationComponent,
      durationInFrames: 350,
      defaultTime: 12.0,
    };
  }

  // Cone Zig-Zag
  if (normalizedName.includes("zig-zag") || normalizedName.includes("zigzag") || normalizedName.includes("sicksack")) {
    return {
      component: ConeZigZagAnimation as AnimationComponent,
      durationInFrames: 330,
      defaultTime: 8.0,
    };
  }

  // Ladder - Icky Shuffle
  if (normalizedName.includes("icky shuffle") || normalizedName.includes("icky-shuffle")) {
    return {
      component: LadderDrillAnimation as unknown as AnimationComponent,
      durationInFrames: 285,
      defaultTime: 5.0,
      extraProps: { drillType: "icky-shuffle" },
    };
  }

  // Ladder - Lateral Shuffle
  if (normalizedName.includes("lateral shuffle") || normalizedName.includes("lateral-shuffle") || normalizedName.includes("sidoförflyttning")) {
    return {
      component: LadderDrillAnimation as unknown as AnimationComponent,
      durationInFrames: 285,
      defaultTime: 6.0,
      extraProps: { drillType: "lateral-shuffle" },
    };
  }

  // Ladder - High Knees
  if (normalizedName.includes("high knees") || normalizedName.includes("high-knees") || normalizedName.includes("höga knän")) {
    return {
      component: LadderDrillAnimation as unknown as AnimationComponent,
      durationInFrames: 285,
      defaultTime: 4.5,
      extraProps: { drillType: "high-knees" },
    };
  }

  // Ladder - In-Out
  if (normalizedName.includes("in-out") || normalizedName.includes("in out") || normalizedName.includes("in-ut")) {
    return {
      component: LadderDrillAnimation as unknown as AnimationComponent,
      durationInFrames: 285,
      defaultTime: 5.5,
      extraProps: { drillType: "in-out" },
    };
  }

  // Generic Ladder drill fallback
  if (normalizedName.includes("ladder") || normalizedName.includes("stege")) {
    return {
      component: LadderDrillAnimation as unknown as AnimationComponent,
      durationInFrames: 285,
      defaultTime: 5.0,
      extraProps: { drillType: "high-knees" },
    };
  }

  return null;
}

export function DrillAnimationPlayer({
  drillName,
  athleteTime,
  benchmarkTier = "average",
  locale = "sv",
}: DrillAnimationPlayerProps) {
  const playerRef = React.useRef<PlayerRef>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Get animation config based on drill name
  const animationConfig = useMemo(() => getAnimationConfig(drillName), [drillName]);

  const totalFrames = animationConfig?.durationInFrames ?? 360;
  const fps = 30;

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleRestart = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0);
    playerRef.current.play();
    setIsPlaying(true);
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (!playerRef.current) return;
    const frame = Math.round((value[0] / 100) * totalFrames);
    playerRef.current.seekTo(frame);
    setCurrentFrame(frame);
  }, [totalFrames]);

  const handleSpeedChange = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate as typeof SPEED_OPTIONS[number]);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setPlaybackRate(SPEED_OPTIONS[nextIndex]);
  }, [playbackRate]);

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        // Fullscreen not supported
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch {
        // Already exited
      }
    }
  }, [isFullscreen]);

  // Handle fullscreen change events
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle player events via addEventListener (Remotion 4.x pattern)
  React.useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    player.addEventListener("frameupdate", handleFrameUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);

    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
    };
  }, [animationConfig]);

  // Don't render if no animation config found
  if (!animationConfig) {
    return null;
  }

  // Cast to any to avoid TypeScript inference issues with the Player generic
  const AnimationComponent = animationConfig.component as React.ComponentType<Record<string, unknown>>;
  const finalAthleteTime = athleteTime ?? animationConfig.defaultTime;

  const progress = (currentFrame / totalFrames) * 100;
  const currentTime = (currentFrame / fps).toFixed(1);
  const totalTime = (totalFrames / fps).toFixed(1);

  return (
    <div className="mt-4">
      <h4 className="font-medium mb-2">Animation</h4>
      <div
        ref={containerRef}
        className={`bg-slate-50 rounded-lg overflow-hidden ${
          isFullscreen ? "p-4" : ""
        }`}
      >
      {/* Player */}
      <div className="relative aspect-[2/1] bg-slate-100">
        <Player
          ref={playerRef}
          component={AnimationComponent}
          compositionWidth={800}
          compositionHeight={400}
          durationInFrames={totalFrames}
          fps={fps}
          style={{
            width: "100%",
            height: "100%",
          }}
          inputProps={{
            athleteTime: finalAthleteTime,
            benchmarkTier,
            locale,
            ...animationConfig.extraProps,
          }}
          playbackRate={playbackRate}
          loop
        />
      </div>

      {/* Controls */}
      <div className="p-3 space-y-2 bg-white border-t">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12 text-right">
            {currentTime}s
          </span>
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-12">
            {totalTime}s
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              className="h-8 w-8"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRestart}
              className="h-8 w-8"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSpeedChange}
              className="h-8 px-2 text-xs font-medium"
            >
              {playbackRate}x
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            className="h-8 w-8"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
