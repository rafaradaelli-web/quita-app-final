import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ─────────────────────────────────────────────────────────────────────────────
// QUITA — Modelo GLB real + diorama minimalista + iluminação vinil
// ─────────────────────────────────────────────────────────────────────────────

export function initScene(canvas) {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent)
  const PR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: !isMobile, powerPreference: 'low-power'
  })
  renderer.setPixelRatio(PR)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.setSize(canvas.clientWidth || 400, canvas.clientHeight || 300, false)

  // ── Cena ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()

  // ── Câmera: levemente de baixo para cima → dá importância ao personagem ──
  const W = canvas.clientWidth  || 400
  const H = canvas.clientHeight || 300
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
  // Posição baixa olhando levemente para cima
  camera.position.set(0, 0.8, 5.8)
  camera.lookAt(0, 1.2, 0)

  // ── Iluminação vinil premium ───────────────────────────────────────────────

  // 1. Ambiente suave — base uniforme que evita sombras duras
  scene.add(new THREE.AmbientLight(0xfff0f8, 0.65))

  // 2. Key light — frontal superior, principal
  const key = new THREE.DirectionalLight(0xffffff, 1.20)
  key.position.set(1.5, 5, 4)
  key.castShadow = true
  key.shadow.mapSize.width  = 1024
  key.shadow.mapSize.height = 1024
  key.shadow.camera.near = 0.5
  key.shadow.camera.far  = 20
  key.shadow.camera.left = key.shadow.camera.bottom = -3
  key.shadow.camera.right = key.shadow.camera.top   =  3
  key.shadow.bias = -0.001
  scene.add(key)

  // 3. Fill roxo — da esquerda, suaviza sombras e dá tom vinil
  const fill = new THREE.DirectionalLight(0xC4B5FD, 0.55)
  fill.position.set(-4, 2, 1)
  scene.add(fill)

  // 4. Rim light rosa — de trás, cria halo característico de brinquedo vinil
  const rim = new THREE.DirectionalLight(0xFF9BC8, 0.60)
  rim.position.set(0, -1, -4)
  scene.add(rim)

  // 5. PointLight branca próxima — cria brilho especular no material
  //    É o "pulo do gato" para parecer brinquedo de vinil
  const specPoint = new THREE.PointLight(0xffffff, 1.8, 6)
  specPoint.position.set(-1.2, 3.5, 2.8)
  scene.add(specPoint)

  // 6. PointLight violeta secundária — rim especular colorido
  const specViolet = new THREE.PointLight(0xA78BFA, 1.2, 5)
  specViolet.position.set(1.8, 2.0, -1.5)
  scene.add(specViolet)

  // ── Plataforma circular minimalista ───────────────────────────────────────
  const platform = new THREE.Group()

  // Disco base — gradiente roxo escuro
  const diskGeo = new THREE.CylinderGeometry(1.8, 1.6, 0.18, 40)
  const diskMat = new THREE.MeshStandardMaterial({
    color: 0x5B21B6, roughness: 0.65, metalness: 0.15
  })
  const disk = new THREE.Mesh(diskGeo, diskMat)
  disk.receiveShadow = true
  disk.position.y = -0.09
  platform.add(disk)

  // Borda superior iluminada (anel mais claro)
  const rimGeo = new THREE.TorusGeometry(1.78, 0.045, 8, 40)
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x8B5CF6, roughness: 0.4, metalness: 0.3,
    emissive: 0x4C1D95, emissiveIntensity: 0.4
  })
  platform.add(new THREE.Mesh(rimGeo, rimMat))

  // Sombra suave sob a plataforma (disco achatado escuro semitransparente)
  const shadowGeo = new THREE.CircleGeometry(2.0, 32)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x1A0A2E, transparent: true, opacity: 0.35,
    depthWrite: false
  })
  const shadowDisk = new THREE.Mesh(shadowGeo, shadowMat)
  shadowDisk.rotation.x = -Math.PI / 2
  shadowDisk.position.y = -0.19
  platform.add(shadowDisk)

  platform.position.set(0, -1.55, 0)
  scene.add(platform)

  // ── Partículas de brilho (opcional — pontos flutuantes ao redor) ──────────
  const starCount = 28
  const starGeo = new THREE.BufferGeometry()
  const starPos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2
    const r = 1.6 + Math.random() * 1.0
    starPos[i * 3]     = Math.cos(angle) * r
    starPos[i * 3 + 1] = -0.8 + Math.random() * 2.4
    starPos[i * 3 + 2] = Math.sin(angle) * r * 0.5
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xEDE9FE, size: 0.045, transparent: true, opacity: 0.7,
    sizeAttenuation: true
  })
  const stars = new THREE.Points(starGeo, starMat)
  scene.add(stars)

  // ── Aura de celebração ────────────────────────────────────────────────────
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xA855F7, transparent: true, opacity: 0, side: THREE.DoubleSide
  })
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 32), glowMat)
  glowRing.rotation.x = Math.PI / 2
  glowRing.position.y = -1.45
  scene.add(glowRing)

  // ── Carregar modelo GLB ────────────────────────────────────────────────────
  let quitaModel = null
  const loader = new GLTFLoader()

  loader.load(
    '/models/quita-real.glb',
    (gltf) => {
      quitaModel = gltf.scene

      // Calcular bounding box para centralizar e escalar corretamente
      const box = new THREE.Box3().setFromObject(quitaModel)
      const size   = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)

      // Centralizar na origem
      quitaModel.position.sub(center)

      // Escalar para altura ~2.2 unidades
      const targetH = 2.2
      const scaleF  = targetH / size.y
      quitaModel.scale.setScalar(scaleF)

      // Reposicionar: base no nível da plataforma
      quitaModel.position.y -= (size.y * scaleF) / 2 - 1.40

      // ── Melhorar materiais para vinil ──────────────────────────────────
      quitaModel.traverse(child => {
        if (!child.isMesh) return
        child.castShadow    = true
        child.receiveShadow = true

        if (child.material) {
          // Clonar para não afetar outros usos
          child.material = child.material.clone()
          // roughness 0.30 → brinquedo vinil que reflete
          child.material.roughness = 0.30
          // metalness 0 → não metálico, mas com brilho plástico
          child.material.metalness = 0.0
          // envMap intensity para capturar as lights de ponto
          child.material.envMapIntensity = 0.8
          child.material.needsUpdate = true
        }
      })

      scene.add(quitaModel)
      console.log('[Quita3D] Modelo GLB carregado ✅', size)
    },
    (progress) => {
      const pct = (progress.loaded / progress.total * 100).toFixed(0)
      console.log(`[Quita3D] Carregando... ${pct}%`)
    },
    (error) => {
      console.error('[Quita3D] Erro ao carregar GLB:', error)
    }
  )

  // ── Câmera targets ─────────────────────────────────────────────────────────
  const CAM_NORMAL = { x: 0, y: 0.8, z: 5.8, lookY: 1.2 }
  const CAM_FOCUS  = { x: 0, y: 1.2, z: 8.0, lookY: 1.4 }
  let camTarget = { ...CAM_NORMAL }

  // ── Estado ────────────────────────────────────────────────────────────────
  let celebrating = false, celebTimer = 0

  // ── API pública ───────────────────────────────────────────────────────────
  const api = {
    onLessonComplete() {
      celebrating = true
      setTimeout(() => { celebrating = false }, 3200)
    },
    updateXP(xp, level) {
      // Escala a plataforma com o nível
      const s = 1 + Math.min(level - 1, 7) * 0.04
      platform.scale.setScalar(s)
    },
    setFocusMode(on) {
      camTarget = on ? { ...CAM_FOCUS } : { ...CAM_NORMAL }
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

  function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    // Flutuação suave do modelo
    if (quitaModel) {
      quitaModel.position.y += Math.sin(t * 1.28) * 0.00055
      // Sway leve
      quitaModel.rotation.y = Math.sin(t * 0.40) * 0.06
      // Respiração (escala X e Z, mantendo Y fixo)
      const breathe = 1 + Math.sin(t * 1.75) * 0.012
      const baseS   = quitaModel.userData.baseScale || 1
      quitaModel.scale.x = baseS * breathe
      quitaModel.scale.z = baseS * breathe
      if (!quitaModel.userData.baseScale) {
        quitaModel.userData.baseScale = quitaModel.scale.y
      }
    }

    // Estrelas giram lentamente
    stars.rotation.y = t * 0.08
    stars.rotation.x = Math.sin(t * 0.12) * 0.04

    // Plataforma pulsa levemente no rim
    platform.children[1].material.emissiveIntensity = 0.3 + Math.sin(t * 1.5) * 0.15

    // PointLight especular orbita suavemente
    specPoint.position.x = Math.sin(t * 0.7) * 1.8 - 0.5
    specPoint.position.z = Math.cos(t * 0.7) * 1.8 + 1.5

    // Celebração
    if (celebrating) {
      celebTimer += 0.065
      glowMat.opacity = 0.22 + Math.sin(celebTimer * 3.0) * 0.20
      glowRing.scale.setScalar(1 + Math.sin(celebTimer * 2.5) * 0.12)
    } else {
      celebTimer = 0
      if (glowMat.opacity > 0.01) glowMat.opacity -= 0.015
      else glowMat.opacity = 0
    }

    // Tween câmera suave
    const lerp = 0.042
    camera.position.x += (camTarget.x - camera.position.x) * lerp
    camera.position.y += (camTarget.y - camera.position.y) * lerp
    camera.position.z += (camTarget.z - camera.position.z) * lerp
    camera.lookAt(0, camTarget.lookY, 0)

    renderer.render(scene, camera)
  }

  const onResize = () => {
    const w = canvas.clientWidth || 400, h = canvas.clientHeight || 300
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  window.addEventListener('resize', onResize)

  animate()
  console.log('[Quita3D] Engine iniciada — aguardando modelo GLB')

  return {
    ...api,
    dispose() {
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }
}
