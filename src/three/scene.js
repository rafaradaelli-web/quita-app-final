import * as THREE from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ─────────────────────────────────────────────────────────────────────────────
// QUITA 3D — v5
// • GLB real com material vinil fosco (roughness 0.75)
// • OrbitControls horizontal-only com damping
// • Idle 30s → pisca os olhos
// • Raycast → aceno de cabeça + som de moeda
// • Plataforma circular minimalista
// ─────────────────────────────────────────────────────────────────────────────

export function initScene(canvas, eventElement) {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent)
  const PR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: !isMobile, powerPreference: 'low-power',
  })
  renderer.setPixelRatio(PR)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setSize(canvas.clientWidth || 400, canvas.clientHeight || 300, false)

  // ── Cena e câmera ─────────────────────────────────────────────────────────
  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    38,
    (canvas.clientWidth || 400) / (canvas.clientHeight || 300),
    0.1, 100
  )
  // Levemente de baixo → dá peso e importância ao personagem
  camera.position.set(0, 0.5, 6.2)
  camera.lookAt(0, 0.2, 0)

  // ── OrbitControls — rotação horizontal apenas ──────────────────────────────
  // Usar eventElement para eventos (div container) se disponível
  // Isso permite canvas com pointer-events:none mas OrbitControls funcional
  const controls = new OrbitControls(camera, eventElement || canvas)
  controls.enableDamping    = true
  controls.dampingFactor    = 0.10
  controls.enableZoom       = false      // sem zoom
  controls.enablePan        = false      // sem pan
  controls.autoRotate       = false      // sem auto-rotação
  // Travar zoom no mouse e no touch (pinça)
  controls.mouseButtons = {
    LEFT:   THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.NONE,
    RIGHT:  THREE.MOUSE.NONE,
  }
  controls.touches = {
    ONE:  THREE.TOUCH.ROTATE,
    TWO:  THREE.TOUCH.NONE,    // desativa pinça de zoom
  }
  // Travar eixo vertical: Math.PI/2 = 1.5708 rad = olhar reto para frente
  controls.minPolarAngle    = Math.PI / 2
  controls.maxPolarAngle    = Math.PI / 2
  // Target: centro do personagem
  controls.target.set(0, 0.2, 0)
  controls.update()

  // ── Iluminação sóbria ──────────────────────────────────────────────────────
  // Ambiente suave — base sem sombras duras
  scene.add(new THREE.AmbientLight(0xfff4fb, 0.80))

  // Luz direcional suave vinda de cima-frente
  const key = new THREE.DirectionalLight(0xffffff, 1.20)
  key.position.set(0.5, 6, 4)
  key.castShadow = true
  key.shadow.mapSize.width  = 1024
  key.shadow.mapSize.height = 1024
  key.shadow.camera.near    = 0.5
  key.shadow.camera.far     = 18
  key.shadow.camera.left = key.shadow.camera.bottom = -2.5
  key.shadow.camera.right = key.shadow.camera.top   =  2.5
  key.shadow.bias = -0.003
  scene.add(key)

  // Fill de preenchimento leve — evita sombras duras nas laterais
  const fill = new THREE.DirectionalLight(0xEDE9FE, 0.45)
  fill.position.set(-3, 2, 1)
  scene.add(fill)

  // Rim posterior rosado — contorno vinil sutil
  const rim = new THREE.DirectionalLight(0xFFC0CB, 0.30)
  rim.position.set(0, -0.5, -4)
  scene.add(rim)

  // ── Plataforma circular ────────────────────────────────────────────────────
  const platform = new THREE.Group()

  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 0.28, 48),
    new THREE.MeshStandardMaterial({ color: 0x5B21B6, roughness: 0.65, metalness: 0.10, emissive: 0x3B1094, emissiveIntensity: 0.20 })
  )
  disk.receiveShadow = true
  disk.position.y = -0.09
  platform.add(disk)

  // Sem anel — palco limpo

  // Sombra projetada sob a plataforma
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 36),
    new THREE.MeshBasicMaterial({
      color: 0x0A0118, transparent: true, opacity: 0.30, depthWrite: false,
    })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y  = -0.16
  platform.add(shadow)

  platform.position.set(0, -0.94, 0)
  scene.add(platform)

  // Partículas sutis de brilho ao redor
  const starCount = 24
  const starPos   = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const a = (i / starCount) * Math.PI * 2
    const r = 1.5 + Math.random() * 1.0
    starPos[i*3]   = Math.cos(a) * r
    starPos[i*3+1] = -0.6 + Math.random() * 2.2
    starPos[i*3+2] = Math.sin(a) * r * 0.45
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const stars = new THREE.Points(starGeo,
    new THREE.PointsMaterial({
      color: 0xEDE9FE, size: 0.040, transparent: true, opacity: 0.60, sizeAttenuation: true,
    })
  )
  scene.add(stars)

  // Aura celebração
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xA855F7, transparent: true, opacity: 0, side: THREE.DoubleSide,
  })
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 32), glowMat)
  glowRing.rotation.x = Math.PI / 2
  glowRing.position.y = -0.82
  scene.add(glowRing)

  // ── Estado de animação ─────────────────────────────────────────────────────
  let quitaModel   = null   // modelo GLB
  let celebrating  = false
  let celebTimer   = 0
  let idleTimer    = 0      // timer para idle blink
  let isBlinking   = false
  let blinkPhase   = 0      // 0=fechando 1=abrindo
  let isNodding    = false  // aceno de cabeça
  let nodPhase     = 0      // fase do aceno
  let userActive   = false  // flag de interação recente

  // Referência à cabeça para piscar/acenar
  let headNode = null

  // ── Som de moeda (Web Audio API — gerado proceduralmente) ─────────────────
  let audioCtx = null
  function playCoinSound() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtx

      // Ding curto: oscilador senoidal com envelope
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type      = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)           // A5
      osc.frequency.exponentialRampToValueAtTime(1480, ctx.currentTime + 0.08) // sobe
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.18) // cai

      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    } catch (e) {
      // AudioContext bloqueado até interação do usuário — silencioso
    }
  }

  // ── Raycaster para detectar clique na Quita ────────────────────────────────
  const raycaster  = new THREE.Raycaster()
  const pointerNDC = new THREE.Vector2()

  function getCanvasNDC(event) {
    const rect = canvas.getBoundingClientRect()
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      ((clientY - rect.top)  / rect.height) * -2 + 1
    )
  }

  function onPointerDown(event) {
    // Marcar usuário como ativo (reseta idle)
    userActive = true
    idleTimer  = 0

    if (!quitaModel) return

    const ndc = getCanvasNDC(event)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObject(quitaModel, true)

    if (hits.length > 0 && !isNodding) {
      // Clicou na Quita → aceno + som
      isNodding = true
      nodPhase  = 0
      playCoinSound()
    }
  }

  function onPointerUp() {
    userActive = false
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('touchstart',  onPointerDown, { passive: true })
  canvas.addEventListener('pointerup',   onPointerUp)
  canvas.addEventListener('touchend',    onPointerUp)

  // Qualquer movimento do OrbitControls reseta o idle
  controls.addEventListener('start', () => { userActive = true; idleTimer = 0 })
  controls.addEventListener('end',   () => { userActive = false })

  // ── Carregar modelo GLB ────────────────────────────────────────────────────
  const loader = new GLTFLoader()
  loader.load(
    '/models/quita-real.glb',
    (gltf) => {
      quitaModel = gltf.scene

      // Centralizar e escalar
      const box    = new THREE.Box3().setFromObject(quitaModel)
      const size   = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)

      quitaModel.position.sub(center)

      const scaleF = 2.2 / size.y
      quitaModel.scale.setScalar(scaleF)
      quitaModel.userData.baseScale = scaleF

      // Base na plataforma
      quitaModel.position.y -= (size.y * scaleF) / 2 - 0.30

      // Material vinil fosco: roughness 0.75, metalness 0
      quitaModel.traverse(child => {
        if (!child.isMesh) return
        child.castShadow    = true
        child.receiveShadow = true

        if (child.material) {
          child.material = child.material.clone()
          child.material.roughness          = 0.75  // fosco — vinil industrial
          child.material.metalness          = 0.0
          child.material.envMapIntensity    = 0.0
          child.material.needsUpdate        = true
        }

        // Tentar identificar a cabeça pelo nome do nó
        const name = (child.name || '').toLowerCase()
        if (!headNode && (name.includes('head') || name.includes('cab') || name.includes('topo'))) {
          headNode = child.parent || child
        }
      })

      // Fallback: usar o próprio modelo como headNode (acena o corpo todo)
      if (!headNode) headNode = quitaModel

      scene.add(quitaModel)
      console.log('[Quita3D] GLB carregado ✅ | headNode:', headNode?.name || 'root')
    },
    null,
    (err) => console.error('[Quita3D] Erro GLB:', err)
  )

  // ── Câmera targets ─────────────────────────────────────────────────────────
  const CAM_NORMAL = { x: 0, y: 0.5, z: 6.2, lookY: 0.2 }
  const CAM_FOCUS  = { x: 0, y: 0.5, z: 8.5, lookY: 0.2 }
  let camTarget = { ...CAM_NORMAL }
  let focusMode = false

  // ── API pública ────────────────────────────────────────────────────────────
  const api = {
    onLessonComplete() {
      celebrating = true
      setTimeout(() => { celebrating = false }, 3200)
    },
    updateXP(xp, level) {
      platform.scale.setScalar(1 + Math.min(level - 1, 7) * 0.04)
    },
    setFocusMode(on) {
      focusMode  = on
      camTarget  = on ? { ...CAM_FOCUS } : { ...CAM_NORMAL }
      // Em modo foco habilitar zoom suave
      controls.enableZoom = false  // zoom sempre desabilitado
    },
    resizeTo(w, h) {
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    },
  }

  // ── Loop de animação ───────────────────────────────────────────────────────
  const clock = new THREE.Clock()
  const IDLE_BLINK_INTERVAL = 30  // segundos

  function animate() {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    const t     = clock.getElapsedTime()

    // Atualizar OrbitControls (necessário com damping)
    controls.update()

    if (quitaModel) {
      const bs = quitaModel.userData.baseScale || 1

      // ── Animação idle base ──
      if (!isNodding) {
        // Flutuação vertical suave
        quitaModel.position.y = 0.30 + Math.sin(t * 1.28) * 0.030
        // Respiração (X e Z)
        const breathe = 1 + Math.sin(t * 1.75) * 0.010
        quitaModel.scale.x = bs * breathe
        quitaModel.scale.z = bs * breathe
        quitaModel.scale.y = bs
      }

      // ── Timer idle → piscar olhos ──────────────────────────────────────
      if (!userActive) {
        idleTimer += delta
        if (idleTimer >= IDLE_BLINK_INTERVAL && !isBlinking && !isNodding) {
          isBlinking = true
          blinkPhase = 0
          idleTimer  = 0
        }
      } else {
        idleTimer = 0
      }

      // ── Animação piscada ───────────────────────────────────────────────
      // Simula piscar escalando o modelo verticalmente de forma muito rápida
      // (técnica: escala Y breve — sem acesso ao osso dos olhos)
      if (isBlinking) {
        blinkPhase += delta * 12  // velocidade da piscada
        const blink = blinkPhase < 0.5
          ? 1 - blinkPhase * 0.06          // fechando levemente
          : 1 - (1 - blinkPhase) * 0.06    // abrindo
        quitaModel.scale.y = bs * Math.max(blink, 0.94)
        if (blinkPhase >= 1.0) {
          isBlinking = false
          blinkPhase = 0
          quitaModel.scale.y = bs
        }
      }

      // ── Animação aceno de cabeça ────────────────────────────────────────
      // Usa rotação X do headNode para simular aceno afirmativo
      if (isNodding) {
        nodPhase += delta * 8  // velocidade do aceno
        // Curva: desce → sobe → desce → sobe → neutro (2 nods)
        const nodCurve = Math.sin(nodPhase * Math.PI * 2) * 0.18
        if (headNode) headNode.rotation.x = nodCurve
        if (nodPhase >= 1.0) {
          isNodding = false
          nodPhase  = 0
          if (headNode) headNode.rotation.x = 0
        }
      }
    }

    // Estrelas giram lentamente
    stars.rotation.y = t * 0.07

    // Anel emissivo pulsa


    // Celebração
    if (celebrating) {
      celebTimer += delta
      glowMat.opacity = 0.20 + Math.sin(celebTimer * 3.0) * 0.18
      glowRing.scale.setScalar(1 + Math.sin(celebTimer * 2.5) * 0.12)
    } else {
      celebTimer = 0
      if (glowMat.opacity > 0.01) glowMat.opacity -= 0.015
      else glowMat.opacity = 0
    }

    // Tween câmera (desativado quando OrbitControls está ativo)
    if (!userActive) {
      const lerp = 0.038
      camera.position.x += (camTarget.x - camera.position.x) * lerp
      camera.position.y += (camTarget.y - camera.position.y) * lerp
      camera.position.z += (camTarget.z - camera.position.z) * lerp
      controls.target.y += (camTarget.lookY - controls.target.y) * lerp
    }

    renderer.render(scene, camera)
  }

  const onResize = () => {
    const w = canvas.clientWidth || 400, h = canvas.clientHeight || 300
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  window.addEventListener('resize', onResize)

  // Impedir zoom do browser via scroll/pinça no canvas
  const onWheel = (e) => e.preventDefault()
  canvas.addEventListener('wheel', onWheel, { passive: false })

  // Impedir zoom via gesture no iOS/Safari
  const onGesture = (e) => e.preventDefault()
  canvas.addEventListener('gesturestart', onGesture, { passive: false })
  canvas.addEventListener('gesturechange', onGesture, { passive: false })

  animate()
  console.log('[Quita3D] v5 — OrbitControls + Idle Blink + Raycast Nod')

  return {
    ...api,
    // Conectar OrbitControls a um elemento DOM externo (ex: div container)
    // Permite canvas com pointer-events:none mas rotação funcionando no div
    setEventElement(el) {
      if (!el || controls.domElement === el) return
      // Remover listeners do canvas
      controls.dispose()
      // Reinicializar controls com o novo elemento
      controls.connect(el)
      // Garantir que zoom continua desabilitado
      controls.enableZoom = false
      controls.mouseButtons = {
        LEFT:   THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.NONE,
        RIGHT:  THREE.MOUSE.NONE,
      }
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.NONE,
      }
      // Prevenir zoom via scroll no novo elemento
      el.addEventListener('wheel', (e) => e.preventDefault(), { passive: false })
    },
    dispose() {
      canvas.removeEventListener('pointerdown',   onPointerDown)
      canvas.removeEventListener('touchstart',    onPointerDown)
      canvas.removeEventListener('pointerup',     onPointerUp)
      canvas.removeEventListener('touchend',      onPointerUp)
      canvas.removeEventListener('wheel',         onWheel)
      canvas.removeEventListener('gesturestart',  onGesture)
      canvas.removeEventListener('gesturechange', onGesture)
      controls.dispose()
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    },
  }
}
