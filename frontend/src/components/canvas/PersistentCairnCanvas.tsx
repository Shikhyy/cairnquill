import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Persistent 3D WebGL Canvas – Bohemian Lit-Up Artifact
 * Renders an abstract, mathematically balanced Cairn (stacked basalt monoliths + radiant amber keystone)
 * with internal point lighting, desert sun/terracotta rim lighting, and luminous ember particles.
 * 
 * Performance Invariant:
 * - DPR clamped to Math.min(window.devicePixelRatio, 2)
 * - Decoupled render loop with lerped mouse coordinates
 * - Disposes all geometries and materials on unmount
 */

export function PersistentCairnCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    // Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 18)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    container.appendChild(renderer.domElement)

    // Cairn Group (The Stacked Proof Stones)
    const cairnGroup = new THREE.Group()
    scene.add(cairnGroup)

    // Procedural Stone Geometries (4 Balanced Monoliths)
    const stoneConfigs = [
      // Base Foundation Stone
      { radius: 3.2, height: 1.4, segments: 7, y: -3.8, rotY: 0.2, isKeystone: false },
      // Mid Lower Stone
      { radius: 2.5, height: 1.2, segments: 6, y: -1.8, rotY: 0.8, isKeystone: false },
      // Mid Upper Stone
      { radius: 1.8, height: 1.0, segments: 8, y: -0.2, rotY: 1.5, isKeystone: false },
      // Top Beacon Monolith (LIT UP KEYSTONE)
      { radius: 1.15, height: 1.35, segments: 5, y: 1.5, rotY: 2.4, isKeystone: true },
    ]

    // Bohemian Shaders: Warm Basalt Obsidian for Base Stones
    const basaltMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x181410,
      roughness: 0.32,
      metalness: 0.82,
      clearcoat: 0.65,
      clearcoatRoughness: 0.25,
      reflectivity: 0.85,
    })

    // Luminous Illuminated Sun-Keystone Material
    const keystoneMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.75,
      roughness: 0.18,
      metalness: 0.7,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
      reflectivity: 0.95,
    })

    // Delicate Warm Amber Wireframe
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    })

    const stoneMeshes: THREE.Mesh[] = []

    stoneConfigs.forEach((cfg) => {
      const geom = new THREE.CylinderGeometry(cfg.radius * 0.85, cfg.radius, cfg.height, cfg.segments)
      
      // Jitter vertices subtly for authentic geological stone faceting
      const pos = geom.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i)
        const vy = pos.getY(i)
        const vz = pos.getZ(i)
        const jitter = 0.08
        pos.setXYZ(i, vx + (Math.sin(vy * 5 + i) * jitter), vy, vz + (Math.cos(vx * 5 + i) * jitter))
      }
      geom.computeVertexNormals()

      const mat = cfg.isKeystone ? keystoneMaterial : basaltMaterial
      const mesh = new THREE.Mesh(geom, mat)
      const wire = new THREE.Mesh(geom, wireframeMaterial)
      mesh.add(wire)

      mesh.position.y = cfg.y
      mesh.rotation.y = cfg.rotY
      mesh.rotation.x = 0.05
      cairnGroup.add(mesh)
      stoneMeshes.push(mesh)
    })

    // Ambient Bohemian Firefly Embers (160 Glowing Dust Tokens)
    const particleCount = 160
    const particleGeometry = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 28
      particlePositions[i + 1] = (Math.random() - 0.5) * 22
      particlePositions[i + 2] = (Math.random() - 0.5) * 18
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.065,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    })

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particleSystem)

    // ── Bohemian Lighting Rig: Warm Radiant Hearth ───────────────────────────
    
    // Internal Artifact Point Light (Emanates glowing amber halo from the keystone)
    const keystoneLight = new THREE.PointLight(0xf59e0b, 5.0, 26, 1.8)
    keystoneLight.position.set(0, 1.5, 0.6)
    cairnGroup.add(keystoneLight)

    // Soft Ambient Warm Hearth Light
    const ambientLight = new THREE.AmbientLight(0x28201a, 1.6)
    scene.add(ambientLight)

    // Key Directional Light (Desert Sun Gold from Top Left)
    const keyLight = new THREE.DirectionalLight(0xfbbf24, 2.8)
    keyLight.position.set(-8, 14, 12)
    scene.add(keyLight)

    // Rim Directional Light (Bohemian Terracotta Sunset from Bottom Right)
    const rimLight = new THREE.DirectionalLight(0xe07a5f, 2.2)
    rimLight.position.set(8, -6, -6)
    scene.add(rimLight)

    // Mouse Tracking with smooth Lerp
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
    let scrollY = 0

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2
    }

    const handleScroll = () => {
      scrollY = window.scrollY
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    window.addEventListener('resize', handleResize)

    // Render Animation Loop (Guaranteed 60/120 FPS decoupled RAF)
    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const elapsedTime = clock.getElapsedTime()

      // Lerp mouse coordinates
      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05

      // Subtle group rotation and parallax
      cairnGroup.rotation.y = elapsedTime * 0.09 + mouse.x * 0.35
      cairnGroup.rotation.x = 0.15 + mouse.y * 0.15
      
      // Position shifts subtly based on page scroll
      cairnGroup.position.y = (scrollY * 0.003)
      cairnGroup.position.x = 4.2 - (mouse.x * 0.5)

      // Keystone breathing light pulse
      keystoneLight.intensity = 4.5 + Math.sin(elapsedTime * 2.0) * 0.8

      // Individual stone micro-float (natural balance simulation)
      stoneMeshes.forEach((mesh, index) => {
        mesh.rotation.y += Math.sin(elapsedTime * 0.5 + index) * 0.0012
      })

      // Particle drift (gentle swirling convection)
      particleSystem.rotation.y = elapsedTime * 0.03
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.2) * 0.05

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }

      // Dispose Geometries and Materials
      stoneMeshes.forEach((m) => {
        m.geometry.dispose()
      })
      particleGeometry.dispose()
      basaltMaterial.dispose()
      keystoneMaterial.dispose()
      wireframeMaterial.dispose()
      particleMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden" 
      aria-hidden="true" 
    />
  )
}
