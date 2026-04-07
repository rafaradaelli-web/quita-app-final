import { useEffect, useRef, useCallback } from 'react'
import { initScene } from '../three/scene'

// Cena persistente — modelo carregado uma vez, nunca destruído
let _api = null
let _currentModel = null
let _currentBg = null

export function useQuitaScene(xp, level, isExpanded = false, modelPath, bgId) {
  const cardRef = useRef(null)

  // Callback ref: quando canvas monta, conecta a cena
  const setCanvasRef = useCallback((el) => {
    if (el) {
      if (!_api) {
        // Primeira vez: criar cena completa
        _api = initScene(el, null)
        const path = modelPath || '/models/quita-real.glb'
        _api.loadModel(path)
        _currentModel = path
        if (bgId) { _api.setBackground(bgId); _currentBg = bgId }
      } else {
        // Cena já existe: reconectar ao novo canvas (instantâneo)
        _api.reattach(el)
      }
      // Ajustar tamanho
      const card = cardRef.current
      if (card) {
        const w = card.offsetWidth, h = card.offsetHeight
        if (w > 0 && h > 0) _api.resizeTo(w, h)
      }
    }
    // Quando canvas desmonta (el === null): não fazer nada
    // A cena continua viva na memória pra reattach rápido
  }, [modelPath, bgId])

  // Resize quando card muda de tamanho
  useEffect(() => {
    const card = cardRef.current
    if (!card || !window.ResizeObserver) return
    const ro = new ResizeObserver(() => {
      if (_api) {
        const w = card.offsetWidth, h = card.offsetHeight
        if (w > 0 && h > 0) _api.resizeTo(w, h)
      }
    })
    ro.observe(card)
    return () => ro.disconnect()
  })

  useEffect(() => { _api?.updateXP(xp, level) }, [xp, level])
  useEffect(() => { _api?.setFocusMode(isExpanded) }, [isExpanded])

  useEffect(() => {
    if (_api && modelPath && modelPath !== _currentModel) {
      _api.loadModel(modelPath); _currentModel = modelPath
    }
  }, [modelPath])

  useEffect(() => {
    if (_api && bgId !== _currentBg) {
      _api.setBackground(bgId || 'padrao'); _currentBg = bgId
    }
  }, [bgId])

  const celebrate = (count) => _api?.onLessonComplete(count)
  const loadModel = useCallback((path) => { if (_api) { _api.loadModel(path); _currentModel = path } }, [])
  const setBackground = useCallback((id) => { if (_api) { _api.setBackground(id); _currentBg = id } }, [])

  return { celebrate, cardRef, setCanvasRef, loadModel, setBackground }
}
