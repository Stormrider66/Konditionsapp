'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Player, PlayerRef } from '@remotion/player'
import {
  IceHockeyDrillAnimation,
  calculateDrillDuration,
  type DrillStructure,
} from '@/remotion/drills/compositions/IceHockeyDrillAnimation'
import { getSportConfig, type DrillSportType } from '@/remotion/drills/surfaces'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, RotateCcw, Maximize2, Minimize2 } from 'lucide-react'

interface DrillAnimationPlayerProps {
  title: string
  description?: string
  structure: DrillStructure
  locale?: 'en' | 'sv'
  sportType?: DrillSportType
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const

export function DrillAnimationPlayer({
  title,
  description,
  structure,
  locale = 'sv',
  sportType = 'ICE_HOCKEY',
}: DrillAnimationPlayerProps) {
  const sportConfig = useMemo(() => getSportConfig(sportType), [sportType])
  const playerRef = useRef<PlayerRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentFrame, setCurrentFrame] = useState(0)

  const totalFrames = useMemo(
    () => calculateDrillDuration(structure.movements),
    [structure.movements]
  )

  const fps = 30

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pause()
    } else {
      playerRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleRestart = useCallback(() => {
    if (!playerRef.current) return
    playerRef.current.seekTo(0)
    playerRef.current.play()
    setIsPlaying(true)
  }, [])

  const handleSeek = useCallback(
    (value: number[]) => {
      if (!playerRef.current) return
      const frame = Math.round((value[0] / 100) * totalFrames)
      playerRef.current.seekTo(frame)
      setCurrentFrame(frame)
    },
    [totalFrames]
  )

  const handleSpeedChange = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(
      playbackRate as (typeof SPEED_OPTIONS)[number]
    )
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length
    setPlaybackRate(SPEED_OPTIONS[nextIndex])
  }, [playbackRate])

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch {
        // Fullscreen not supported
      }
    } else {
      try {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } catch {
        // Already exited
      }
    }
  }, [isFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    player.addEventListener('frameupdate', handleFrameUpdate)
    player.addEventListener('play', handlePlay)
    player.addEventListener('pause', handlePause)
    player.addEventListener('ended', handleEnded)

    return () => {
      player.removeEventListener('frameupdate', handleFrameUpdate)
      player.removeEventListener('play', handlePlay)
      player.removeEventListener('pause', handlePause)
      player.removeEventListener('ended', handleEnded)
    }
  }, [structure])

  const AnimationComponent = IceHockeyDrillAnimation as React.ComponentType<Record<string, unknown>>
  const progress = (currentFrame / totalFrames) * 100
  const currentTime = (currentFrame / fps).toFixed(1)
  const totalTime = (totalFrames / fps).toFixed(1)

  return (
    <div
      ref={containerRef}
      className={`bg-slate-50 rounded-lg overflow-hidden ${isFullscreen ? 'p-4' : ''}`}
    >
      {/* Player */}
      <div className="relative bg-slate-100" style={{ aspectRatio: `${sportConfig.width + 10} / ${sportConfig.height + 20}` }}>
        <Player
          ref={playerRef}
          component={AnimationComponent}
          compositionWidth={800}
          compositionHeight={Math.round(800 * (sportConfig.height + 20) / (sportConfig.width + 10))}
          durationInFrames={totalFrames}
          fps={fps}
          style={{ width: '100%', height: '100%' }}
          inputProps={{
            title,
            description: description || '',
            structure,
            locale,
            sportType,
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
          <span className="text-xs text-muted-foreground w-12">{totalTime}s</span>
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
  )
}
