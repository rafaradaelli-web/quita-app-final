import { useEffect, useRef } from 'react'
import { initScene } from '../three/scene'

export function useQuitaScene(xp, level, isExpanded = false) {
  const sceneRef = useRef(null)
  const cardRef  = useRef(null)

  // Inicializa Three.js uma única vez
  useEffect(() => {
    const canvas = document.getElementById('quita-canvas')
    if (!canvas || sceneRef.current) return
    sceneRef.current = initScene(canvas)
  }, [])

  // Posiciona o canvas
  useEffect(() => {
    const canvas = document.getElementById('quita-canvas')
    if (!canvas) return

    if (isExpanded) {
      const maxW = Math.min(window.innerWidth, 430)
      const left = Math.max(0, (window.innerWidth - maxW) / 2)
      canvas.style.cssText = `
        position: fixed;
        top: 0; left: ${left}px;
        width: ${maxW}px; height: ${window.innerHeight}px;
        z-index: 2; pointer-events: auto;
        display: block; cursor: grab;
      `
      sceneRef.current?.resizeTo(maxW, window.innerHeight)
      document.body.classList.add('focus-mode')
      return () => document.body.classList.remove('focus-mode')
    }

    const syncPosition = () => {
      const card = cardRef.current
      if (!card) { canvas.style.display = 'none'; return }
      const rect = card.getBoundingClientRect()
      const maxW = Math.min(window.innerWidth, 430)
      const rootLeft = Math.max(0, (window.innerWidth - maxW) / 2)
      canvas.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rootLeft + 16}px;
        width: ${maxW - 32}px;
        height: ${rect.height}px;
        z-index: 2; pointer-events: auto;
        display: block; border-radius: 12px;
        cursor: grab;
      `
      sceneRef.current?.resizeTo(maxW - 32, rect.height)
    }

    syncPosition()
    const interval = setInterval(syncPosition, 100)
    window.addEventListener('scroll', syncPosition, { passive: true })
    window.addEventListener('resize', syncPosition, { passive: true })

    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', syncPosition)
      window.removeEventListener('resize', syncPosition)
      const c = document.getElementById('quita-canvas')
      if (c) c.style.display = 'none'
    }
  }, [isExpanded])

  useEffect(() => { sceneRef.current?.updateXP(xp, level) }, [xp, level])
  useEffect(() => { sceneRef.current?.setFocusMode(isExpanded) }, [isExpanded])

  useEffect(() => {
    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
      const c = document.getElementById('quita-canvas')
      if (c) c.style.display = 'none'
    }
  }, [])

  const celebrate = (count) => sceneRef.current?.onLessonComplete(count)
  return { celebrate, cardRef }
}
