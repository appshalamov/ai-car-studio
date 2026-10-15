import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type BodyKind = 'sedan' | 'crossover' | 'truck'
export type Finish = 'gloss' | 'matte' | 'satin' | 'chrome'

// Side profiles (x forward, y up) in meters, roughly.
const PROFILES: Record<BodyKind, { pts: [number, number][]; glass: [number, number][]; wheels: number[]; r: number; width: number }> = {
  sedan: {
    pts: [[-2.3, 0.35], [-2.35, 0.75], [-2.0, 0.95], [-1.1, 1.0], [-0.55, 1.42], [0.45, 1.42], [1.2, 1.0], [2.1, 0.86], [2.35, 0.62], [2.3, 0.35]],
    glass: [[-1.0, 1.02], [-0.5, 1.38], [0.42, 1.38], [1.08, 1.02]],
    wheels: [-1.45, 1.45], r: 0.36, width: 1.85,
  },
  crossover: {
    pts: [[-2.35, 0.4], [-2.4, 0.95], [-2.1, 1.25], [-1.2, 1.3], [-0.6, 1.62], [0.55, 1.62], [1.25, 1.1], [2.15, 0.95], [2.4, 0.68], [2.35, 0.4]],
    glass: [[-1.95, 1.27], [-0.58, 1.58], [0.52, 1.58], [1.15, 1.12], [-1.1, 1.3]],
    wheels: [-1.5, 1.5], r: 0.4, width: 1.92,
  },
  truck: {
    pts: [[-2.85, 0.45], [-2.85, 1.15], [-0.1, 1.9], [2.6, 1.15], [2.85, 1.05], [2.85, 0.45]],
    glass: [[-0.6, 1.72], [-0.1, 1.86], [1.6, 1.4], [0.9, 1.4]],
    wheels: [-1.9, 1.9], r: 0.45, width: 2.2,
  },
}

function extrude(points: [number, number][], depth: number, bevel: number) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 6, steps: 1 })
  g.translate(0, 0, -depth / 2)
  // planar UVs: side view mapped across the length, top/caps continue by z
  g.computeBoundingBox()
  const b = g.boundingBox!
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    uv[i * 2] = (x - b.min.x) / (b.max.x - b.min.x)
    uv[i * 2 + 1] = (y - b.min.y + Math.abs(z) * 0.6) / (b.max.y - b.min.y + 1.2)
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

export function Car3D({ texture, kind, finish, scale, base }: { texture: string | null; kind: BodyKind; finish: Finish; scale: number; base: string }) {
  const host = useRef<HTMLDivElement>(null)
  const state = useRef<{ mat?: THREE.MeshPhysicalMaterial; build?: (k: BodyKind) => void; tex?: THREE.Texture }>({})

  useEffect(() => {
    const el = host.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(6.5, 3, 6.5)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.8, 0)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.2
    controls.maxPolarAngle = Math.PI / 2.05
    controls.minDistance = 4
    controls.maxDistance = 14

    // simple studio environment
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    envScene.background = new THREE.Color('#6b7280')
    const panel = (x: number, y: number, z: number, w: number, h: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }))
      m.position.set(x, y, z)
      m.lookAt(0, 0, 0)
      envScene.add(m)
    }
    panel(0, 8, 0, 10, 4); panel(8, 3, 0, 3, 8); panel(-8, 3, 4, 3, 6); panel(0, 2, -9, 8, 3)
    scene.environment = pmrem.fromScene(envScene, 0.04).texture

    scene.add(new THREE.HemisphereLight('#ffffff', '#222233', 0.6))
    const sun = new THREE.DirectionalLight('#ffffff', 1.6)
    sun.position.set(4, 8, 3)
    scene.add(sun)
    const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: '#16181d', roughness: 0.6, metalness: 0.2 }))
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.45 }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.01
    shadow.scale.set(2.8, 1.25, 1)
    scene.add(shadow)

    const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', clearcoat: 1, clearcoatRoughness: 0.08, roughness: 0.35, metalness: 0.2 })
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0b1118', roughness: 0.05, metalness: 0.6, clearcoat: 1 })
    const tireMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 })
    const rimMat = new THREE.MeshStandardMaterial({ color: '#9aa1a8', roughness: 0.25, metalness: 0.9 })
    let car = new THREE.Group()
    scene.add(car)

    const build = (k: BodyKind) => {
      scene.remove(car)
      car.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
      car = new THREE.Group()
      const p = PROFILES[k]
      const body = new THREE.Mesh(extrude(p.pts, p.width - 0.2, 0.1), mat)
      car.add(body)
      for (const side of [-1, 1]) {
        const g = new THREE.Mesh(extrude(p.glass, 0.02, 0.01), glassMat)
        g.position.z = side * (p.width / 2 - 0.02)
        car.add(g)
      }
      const glassTop = new THREE.Mesh(extrude(p.glass, p.width - 0.36, 0.06), glassMat)
      glassTop.scale.set(0.98, 1.0, 1)
      glassTop.position.y = 0.025
      car.add(glassTop)
      for (const x of p.wheels) for (const z of [-1, 1]) {
        const w = new THREE.Group()
        const tire = new THREE.Mesh(new THREE.TorusGeometry(p.r * 0.78, p.r * 0.24, 16, 40), tireMat)
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.62, p.r * 0.62, 0.22, 30), rimMat)
        rim.rotation.x = Math.PI / 2
        w.add(tire, rim)
        w.position.set(x, p.r, z * (p.width / 2 - 0.08))
        car.add(w)
      }
      scene.add(car)
    }
    build('sedan')
    state.current = { mat, build }

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    let raf = 0
    const loop = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()
    const stop = () => { controls.autoRotate = false }
    renderer.domElement.addEventListener('pointerdown', stop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      pmrem.dispose()
      el.innerHTML = ''
    }
  }, [])

  useEffect(() => { state.current.build?.(kind) }, [kind])

  useEffect(() => {
    const mat = state.current.mat
    if (!mat) return
    if (!texture) {
      mat.map = null
      mat.color.set(base)
      mat.needsUpdate = true
      return
    }
    new THREE.TextureLoader().load(texture, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(scale, scale)
      tex.anisotropy = 8
      state.current.tex?.dispose()
      state.current.tex = tex
      mat.map = tex
      mat.color.set('#ffffff')
      mat.needsUpdate = true
    })
  }, [texture, base, scale])

  useEffect(() => {
    const mat = state.current.mat
    if (!mat) return
    const f = { gloss: [0.3, 0.15, 1], matte: [0.85, 0.05, 0], satin: [0.55, 0.1, 0.3], chrome: [0.05, 1, 1] }[finish]
    mat.roughness = f[0]
    mat.metalness = f[1]
    mat.clearcoat = f[2]
    mat.needsUpdate = true
  }, [finish])

  return <div className="car3d" ref={host} />
}
