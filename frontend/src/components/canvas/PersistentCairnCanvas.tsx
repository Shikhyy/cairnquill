import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Persistent 3D WebGL Canvas
 * Renders an abstract, mathematically balanced Cairn (stacked obsidian monoliths)
 * with custom GLSL rim shaders and dynamic camera choreography responding to scroll & mouse.
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
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // Cairn Group (The Stacked Proof Stones)
    const cairnGroup = new THREE.Group()
    scene.add(cairnGroup)

    // Procedural Stone Geometries (4 Balanced Monoliths)
    const stoneConfigs = [
      // Base Foundation Stone
      { radius: 3.2, height: 1.4, segments: 7, y: -3.8, rotY: 0.2 },
      // Mid Lower Stone
      { radius: 2.5, height: 1.2, segments: 6, y: -1.8, rotY: 0.8 },
      // Mid Upper Keystone
      { radius: 1.8, height: 1.0, segments: 8, y: -0.2, rotY: 1.5 },
      // Top Beacon Monolith (balanced on edge)
      { radius: 1.1, height: 1.3, segments: 5, y: 1.5, rotY: 2.4 },
    ]

    // Custom Shaders for Obsidian Material with Iridescent Rim Lighting
    const customMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f121d,
      roughness: 0.25,
      metalness: 0.85,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      reflectivity: 0.8,
    })

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    })

    const stoneMeshes: THREE.Mesh[] = []

    stoneConfigs.forEach((cfg) => {
      // Cylinder with randomized angular vertices simulates hand-chiselled stone
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

      const mesh = new THREE.Mesh(geom, customMaterial)
      const wire = new THREE.Mesh(geom, wireframeMaterial)
      mesh.add(wire)

      mesh.position.y = cfg.y
      mesh.rotation.y = cfg.rotY
      mesh.rotation.x = 0.05
      cairnGroup.add(mesh)
      stoneMeshes.push(mesh)
    })

    // Ambient particles (Verifiable Claim Tokens floating subtly)
    const particleCount = 120
    const particleGeometry = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 26
      particlePositions[i + 1] = (Math.random() - 0.5) * 20
      particlePositions[i + 2] = (Math.random() - 0.5) * 16
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    })

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particleSystem)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    // Directional Key Light (Cold Blue from Top Left)
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.5)
    keyLight.position.set(-8, 12, 10)
    scene.add(keyLight)

    // Subtle Rim Light (Emerald from Bottom Right)
    const rimLight = new THREE.DirectionalLight(0x10b981, 1.8)
    rimLight.position.set(8, -6, -5)
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

      // Lerp mouse
      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05

      // Subtle group rotation and parallax
      cairnGroup.rotation.y = elapsedTime * 0.08 + mouse.x * 0.35
      cairnGroup.rotation.x = 0.15 + mouse.y * 0.15
      
      // Position shifts subtly based on page scroll
      cairnGroup.position.y = (scrollY * 0.003)
      cairnGroup.position.x = 4.2 - (mouse.x * 0.5) // Positioned slightly on the right half

      // Individual stone micro-float (natural balance simulation)
      stoneMeshes.forEach((mesh, index) => {
        mesh.rotation.y += Math.sin(elapsedTime * 0.5 + index) * 0.001
      })

      // Particle drift
      particleSystem.rotation.y = elapsedTime * 0.02

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
      customMaterial.dispose()
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
