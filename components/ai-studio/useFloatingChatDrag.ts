'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface FloatingChatPosition {
  right: number
  bottom: number
}

const DESKTOP_BREAKPOINT = 640
const EDGE_GAP = 12
const DEFAULT_POSITION: FloatingChatPosition = {
  right: 24,
  bottom: 24,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useFloatingChatDrag() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [position, setPosition] = useState<FloatingChatPosition>(DEFAULT_POSITION)
  const dragDistanceRef = useRef(0)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const updateDesktopState = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    }

    updateDesktopState()
    window.addEventListener('resize', updateDesktopState)
    return () => window.removeEventListener('resize', updateDesktopState)
  }, [])

  const startDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
      const root = event.currentTarget.closest('[data-floating-chat-root]') as HTMLElement | null
      if (!root) return

      event.preventDefault()

      const rect = root.getBoundingClientRect()
      const startX = event.clientX
      const startY = event.clientY
      const startLeft = rect.left
      const startTop = rect.top
      const width = rect.width
      const height = rect.height
      dragDistanceRef.current = 0
      suppressClickRef.current = false

      const handlePointerMove = (moveEvent: PointerEvent) => {
        dragDistanceRef.current = Math.max(
          dragDistanceRef.current,
          Math.abs(moveEvent.clientX - startX),
          Math.abs(moveEvent.clientY - startY)
        )
        if (dragDistanceRef.current > 6) {
          suppressClickRef.current = true
        }

        const nextLeft = clamp(
          startLeft + (moveEvent.clientX - startX),
          EDGE_GAP,
          window.innerWidth - width - EDGE_GAP
        )
        const nextTop = clamp(
          startTop + (moveEvent.clientY - startY),
          EDGE_GAP,
          window.innerHeight - height - EDGE_GAP
        )

        setPosition({
          right: window.innerWidth - nextLeft - width,
          bottom: window.innerHeight - nextTop - height,
        })
      }

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }, [])

  const handleButtonDragStart = useCallback((event: React.PointerEvent<HTMLElement>) => {
    startDrag(event)
  }, [startDrag])

  const handlePanelDragStart = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!isDesktop) return
    startDrag(event)
  }, [isDesktop, startDrag])

  const buttonFloatingStyle = {
    right: `${position.right}px`,
    bottom: `${position.bottom}px`,
    left: 'auto',
    top: 'auto',
  }

  const panelFloatingStyle = isDesktop
    ? {
        right: `${position.right}px`,
        bottom: `${position.bottom}px`,
        left: 'auto',
        top: 'auto',
      }
    : undefined

  const handleActivatorClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClickRef.current = false
    }
  }, [])

  return {
    isDesktop,
    buttonFloatingStyle,
    panelFloatingStyle,
    handleButtonDragStart,
    handlePanelDragStart,
    handleActivatorClick,
  }
}
