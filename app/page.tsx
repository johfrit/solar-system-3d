"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RotateCcw, Sun, Moon } from "lucide-react"

// Planet data with realistic proportions (scaled for visualization)
const PLANET_DATA = {
  mercury: { name: "Mercury", radius: 0.38, distance: 8, speed: 4.74, color: 0x8c7853 },
  venus: { name: "Venus", radius: 0.95, distance: 12, speed: 3.5, color: 0xffc649 },
  earth: { name: "Earth", radius: 1, distance: 16, speed: 2.98, color: 0x6b93d6 },
  mars: { name: "Mars", radius: 0.53, distance: 20, speed: 2.41, color: 0xcd5c5c },
  jupiter: { name: "Jupiter", radius: 2.5, distance: 28, speed: 1.31, color: 0xd8ca9d },
  saturn: { name: "Saturn", radius: 2.1, distance: 36, speed: 0.97, color: 0xfad5a5 },
  uranus: { name: "Uranus", radius: 1.6, distance: 44, speed: 0.68, color: 0x4fd0e7 },
  neptune: { name: "Neptune", radius: 1.55, distance: 52, speed: 0.54, color: 0x4b70dd },
}

export default function SolarSystemSimulation() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const controlsRef = useRef<OrbitControls>()
  const planetsRef = useRef<{
    [key: string]: { mesh: THREE.Mesh; orbit: THREE.Group; angle: number; label: THREE.Sprite }
  }>({})
  const sunRef = useRef<THREE.Mesh>()
  const clockRef = useRef<THREE.Clock>()
  const animationIdRef = useRef<number>()
  const raycasterRef = useRef<THREE.Raycaster>()
  const mouseRef = useRef<THREE.Vector2>()
  const tooltipRef = useRef<HTMLDivElement>()

  const [isPlaying, setIsPlaying] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [planetSpeeds, setPlanetSpeeds] = useState<{ [key: string]: number }>(() => {
    const speeds: { [key: string]: number } = {}
    Object.entries(PLANET_DATA).forEach(([key, data]) => {
      speeds[key] = data.speed
    })
    return speeds
  })
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(isDarkMode ? 0x000000 : 0x87ceeb) // Changed from 0x000011 to 0x000000
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 30, 60)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    mountRef.current.appendChild(renderer.domElement)

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 20
    controls.maxDistance = 200
    controlsRef.current = controls

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, isDarkMode ? 0.6 : 0.3)
    scene.add(ambientLight)

    const sunLight = new THREE.PointLight(0xffffff, isDarkMode ? 3 : 2, 400)
    sunLight.position.set(0, 0, 0)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.camera.near = 0.1
    sunLight.shadow.camera.far = 400
    scene.add(sunLight)

    // Add rim lighting for better planet definition
    const rimLight = new THREE.DirectionalLight(0x4444ff, isDarkMode ? 0.5 : 0.2)
    rimLight.position.set(50, 50, 50)
    scene.add(rimLight)

    // Create stars background
    createStars(scene)

    // Create sun
    const sunGeometry = new THREE.SphereGeometry(3, 32, 32)
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
    })
    const sun = new THREE.Mesh(sunGeometry, sunMaterial)
    scene.add(sun)
    sunRef.current = sun

    // Add after the sun creation and before the planets creation
    const textureLoader = new THREE.TextureLoader()

    // Replace the texture loading section with actual file paths:
    const planetTextures = {
      mercury: textureLoader.load("/textures/mercury.jpg"),
      venus: textureLoader.load("/textures/venus.jpg"),
      earth: textureLoader.load("/textures/earth.jpg"),
      mars: textureLoader.load("/textures/mars.jpg"),
      jupiter: textureLoader.load("/textures/jupiter.jpg"),
      saturn: textureLoader.load("/textures/saturn.jpg"),
      uranus: textureLoader.load("/textures/uranus.jpg"),
      neptune: textureLoader.load("/textures/neptune.jpg"),
    }

    // Load normal maps for enhanced surface detail
    const planetNormalMaps = {
      earth: textureLoader.load("/textures/earth_normal.jpg"),
      mars: textureLoader.load("/textures/mars_normal.jpg"),
      moon: textureLoader.load("/textures/moon.jpg"),
    }

    // Create planets with improved materials for better visibility
    const planets: { [key: string]: { mesh: THREE.Mesh; orbit: THREE.Group; angle: number; label: THREE.Sprite } } = {}

    Object.entries(PLANET_DATA).forEach(([key, data]) => {
      // Create orbit group
      const orbitGroup = new THREE.Group()
      scene.add(orbitGroup)

      // Create enhanced orbit line with glow effect
      const orbitGeometry = new THREE.RingGeometry(data.distance - 0.02, data.distance + 0.02, 256)
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: isDarkMode ? 0x4a9eff : 0x666666, // Bright blue in dark mode
        transparent: true,
        opacity: isDarkMode ? 0.8 : 0.3,
        side: THREE.DoubleSide,
      })
      const orbitLine = new THREE.Mesh(orbitGeometry, orbitMaterial)
      orbitLine.rotation.x = -Math.PI / 2

      // Add glow effect for orbits in dark mode
      if (isDarkMode) {
        const glowGeometry = new THREE.RingGeometry(data.distance - 0.1, data.distance + 0.1, 256)
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x4a9eff,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        })
        const glowRing = new THREE.Mesh(glowGeometry, glowMaterial)
        glowRing.rotation.x = -Math.PI / 2
        scene.add(glowRing)
      }

      scene.add(orbitLine)

      // Create planet with NASA-quality textures
      const planetGeometry = new THREE.SphereGeometry(data.radius, 128, 128) // Higher detail for textures

      // Enhanced material with textures
      const planetMaterial = new THREE.MeshStandardMaterial({
        map: planetTextures[key as keyof typeof planetTextures],
        normalMap:
          key === "earth" || key === "mars" ? planetNormalMaps[key as keyof typeof planetNormalMaps] : undefined,
        roughness: key === "venus" ? 0.1 : key === "earth" ? 0.7 : 0.8,
        metalness: 0.1,
        emissive: new THREE.Color(data.color).multiplyScalar(0.05),
      })

      const planet = new THREE.Mesh(planetGeometry, planetMaterial)
      planet.position.x = data.distance
      planet.castShadow = true
      planet.receiveShadow = true
      planet.userData = { name: data.name, key }

      // Add special effects for certain planets
      if (key === "saturn") {
        // Add Saturn's rings
        const ringGeometry = new THREE.RingGeometry(data.radius * 1.2, data.radius * 2.2, 64)
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        })
        const rings = new THREE.Mesh(ringGeometry, ringMaterial)
        rings.rotation.x = -Math.PI / 2
        rings.rotation.z = Math.PI / 6 // Tilt Saturn's rings
        planet.add(rings)
      }

      if (key === "earth") {
        // Add Earth's moon
        const moonGeometry = new THREE.SphereGeometry(0.27, 32, 32)
        const moonMaterial = new THREE.MeshStandardMaterial({
          map: planetNormalMaps.moon,
          roughness: 0.9,
          metalness: 0.1,
          color: 0xaaaaaa,
        })
        const moon = new THREE.Mesh(moonGeometry, moonMaterial)
        moon.position.set(2, 0, 0)
        moon.castShadow = true
        moon.receiveShadow = true
        planet.add(moon)
      }

      // Create planet name label with better styling and higher resolution
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")!
      canvas.width = 1024 // Increased from 512
      canvas.height = 256 // Increased from 128

      // Enable better text rendering
      context.textBaseline = "middle"
      context.textAlign = "center"

      // Create gradient background for label
      const gradient = context.createLinearGradient(0, 0, 1024, 0)
      gradient.addColorStop(0, "rgba(0,0,0,0)")
      gradient.addColorStop(0.5, isDarkMode ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)")
      gradient.addColorStop(1, "rgba(0,0,0,0)")

      context.fillStyle = gradient
      context.fillRect(0, 0, 1024, 256)

      // Add text with better quality
      context.fillStyle = isDarkMode ? "#ffffff" : "#000000"
      context.font = "bold 48px Arial, sans-serif" // Increased from 32px
      context.textAlign = "center"
      context.shadowColor = isDarkMode ? "#000000" : "#ffffff"
      context.shadowBlur = 6
      context.shadowOffsetX = 2
      context.shadowOffsetY = 2
      context.fillText(data.name, 512, 128) // Adjusted for new canvas size

      const texture = new THREE.CanvasTexture(canvas)
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        alphaTest: 0.1,
      })
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.scale.set(8, 2, 1) // Adjusted scale for better visibility
      sprite.position.copy(planet.position)
      sprite.position.y += data.radius + 3
      scene.add(sprite)

      orbitGroup.add(planet)

      planets[key] = {
        mesh: planet,
        orbit: orbitGroup,
        angle: Math.random() * Math.PI * 2,
        label: sprite,
      }
    })

    planetsRef.current = planets

    // Initialize raycaster and mouse
    raycasterRef.current = new THREE.Raycaster()
    mouseRef.current = new THREE.Vector2()

    // Clock for animation timing
    clockRef.current = new THREE.Clock()

    // Mouse move handler for tooltips
    const handleMouseMove = (event: MouseEvent) => {
      if (!cameraRef.current || !sceneRef.current) return

      const rect = renderer.domElement.getBoundingClientRect()
      mouseRef.current!.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current!.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      setMousePosition({ x: event.clientX, y: event.clientY })

      raycasterRef.current!.setFromCamera(mouseRef.current!, cameraRef.current)

      const planetMeshes = Object.values(planetsRef.current).map((p) => p.mesh)
      const intersects = raycasterRef.current!.intersectObjects(planetMeshes)

      if (intersects.length > 0) {
        const planet = intersects[0].object as THREE.Mesh
        setHoveredPlanet(planet.userData.name)
        renderer.domElement.style.cursor = "pointer"
      } else {
        setHoveredPlanet(null)
        renderer.domElement.style.cursor = "default"
      }
    }

    renderer.domElement.addEventListener("mousemove", handleMouseMove)

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return

      cameraRef.current.aspect = window.innerWidth / window.innerHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    // Start animation loop
    animate()

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      renderer.domElement.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [isDarkMode])

  // Create stars background
  const createStars = (scene: THREE.Scene) => {
    const starsGeometry = new THREE.BufferGeometry()
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 })

    const starsVertices = []
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000
      const y = (Math.random() - 0.5) * 2000
      const z = (Math.random() - 0.5) * 2000
      starsVertices.push(x, y, z)
    }

    starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starsVertices, 3))
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)
  }

  // Animation loop
  const animate = () => {
    if (!isPlaying) {
      animationIdRef.current = requestAnimationFrame(animate)
      return
    }

    const delta = clockRef.current?.getDelta() || 0

    // Rotate sun
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.5
    }

    // Animate planets and labels with enhanced speed control
    Object.entries(planetsRef.current).forEach(([key, planet]) => {
      // Get current speed from state (this should reflect slider changes)
      const currentSpeed = planetSpeeds[key] || PLANET_DATA[key as keyof typeof PLANET_DATA].speed
      const baseSpeed = PLANET_DATA[key as keyof typeof PLANET_DATA].speed

      // Apply speed with more noticeable effect
      planet.angle += delta * currentSpeed * 0.2 // Increased multiplier from 0.1 to 0.2

      const distance = PLANET_DATA[key as keyof typeof PLANET_DATA].distance
      const radius = PLANET_DATA[key as keyof typeof PLANET_DATA].radius

      planet.mesh.position.x = Math.cos(planet.angle) * distance
      planet.mesh.position.z = Math.sin(planet.angle) * distance

      // Update label position
      planet.label.position.x = planet.mesh.position.x
      planet.label.position.z = planet.mesh.position.z
      planet.label.position.y = planet.mesh.position.y + radius + 2

      // Make labels face camera
      planet.label.lookAt(cameraRef.current!.position)

      // Rotate planet on its axis (also affected by speed for more visual feedback)
      planet.mesh.rotation.y += delta * (2 + currentSpeed * 0.5)

      // Special animations for moons and rings
      if (key === "earth") {
        const moon = planet.mesh.children.find((child) => child instanceof THREE.Mesh)
        if (moon) {
          moon.rotation.y += delta * 1
          // Make moon orbit Earth faster when Earth's speed increases
          const moonAngle = Date.now() * 0.001 * (currentSpeed / baseSpeed)
          moon.position.x = Math.cos(moonAngle) * 2
          moon.position.z = Math.sin(moonAngle) * 2
        }
      }

      if (key === "saturn") {
        const rings = planet.mesh.children.find((child) => child instanceof THREE.Mesh)
        if (rings) {
          rings.rotation.z += delta * 0.1 * (currentSpeed / baseSpeed)
        }
      }
    })

    // Update controls
    controlsRef.current?.update()

    // Render scene
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

    animationIdRef.current = requestAnimationFrame(animate)
  }

  // Enhanced speed change handler with visual feedback
  const handleSpeedChange = (planetKey: string, newSpeed: number[]) => {
    setPlanetSpeeds((prev) => {
      const updated = {
        ...prev,
        [planetKey]: newSpeed[0],
      }

      // Log for debugging (remove in production)
      console.log(`${planetKey} speed changed to: ${newSpeed[0].toFixed(2)}x`)

      return updated
    })
  }

  // Reset all speeds
  const resetSpeeds = () => {
    const defaultSpeeds: { [key: string]: number } = {}
    Object.entries(PLANET_DATA).forEach(([key, data]) => {
      defaultSpeeds[key] = data.speed
    })
    setPlanetSpeeds(defaultSpeeds)
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="fixed inset-0 z-0" />

      {/* Compact UI Controls */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {/* Compact Top Bar */}
        <div className="absolute top-4 left-4 right-4">
          <div className="flex justify-between items-center">
            {/* Minimal Logo */}
            <div className="pointer-events-auto">
              <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2">
                <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  Solar Explorer
                </h1>
              </div>
            </div>

            {/* Compact Controls */}
            <div className="pointer-events-auto flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center gap-1 text-white text-sm">
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isPlaying ? "Pause" : "Play"}
                </div>
              </button>

              <button
                onClick={resetSpeeds}
                className="bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center gap-1 text-white text-sm">
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </div>
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center gap-1 text-white text-sm">
                  {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                  {isDarkMode ? "Light" : "Dark"}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Compact Left Panel */}
        <div className="absolute left-4 top-20 w-64 max-h-96 pointer-events-auto">
          <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-xl p-4 overflow-hidden">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-white mb-1">Speed Controls</h2>
              <p className="text-xs text-gray-300">Adjust orbital speeds</p>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {Object.entries(PLANET_DATA).map(([key, data]) => (
                <div key={key} className="group">
                  <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: `#${data.color.toString(16).padStart(6, "0")}` }}
                        ></div>
                        <span className="text-xs font-medium text-white">{data.name}</span>
                      </div>
                      <div className="bg-white/10 rounded px-2 py-0.5 transition-all duration-200">
                        <span className="text-xs font-mono text-blue-300">
                          {planetSpeeds[key]?.toFixed(1)}×
                          {planetSpeeds[key] !== data.speed && <span className="ml-1 text-green-400">●</span>}
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <Slider
                        value={[planetSpeeds[key] || data.speed]}
                        onValueChange={(value) => handleSpeedChange(key, value)}
                        max={10}
                        min={0.1}
                        step={0.1}
                        className="w-full compact-slider"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Info Panel */}
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-xl p-3 max-w-xs">
            <h3 className="text-sm font-semibold text-white mb-2">Controls</h3>
            <div className="space-y-1 text-xs text-gray-300">
              <div>
                • <strong>Drag:</strong> Rotate view
              </div>
              <div>
                • <strong>Scroll:</strong> Zoom
              </div>
              <div>
                • <strong>Hover:</strong> Planet info
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Planet Tooltip */}
      {hoveredPlanet && (
        <div
          className="fixed z-30 pointer-events-none transition-all duration-200"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
          }}
        >
          <div className="bg-black/40 backdrop-blur-md border border-white/30 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: `#${Object.entries(PLANET_DATA)
                    .find(([_, data]) => data.name === hoveredPlanet)?.[1]
                    .color.toString(16)
                    .padStart(6, "0")}`,
                }}
              ></div>
              <h4 className="font-semibold text-white text-sm">{hoveredPlanet}</h4>
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Speed:</span>
                <span className="font-mono text-blue-300">
                  {Object.entries(PLANET_DATA).find(([_, data]) => data.name === hoveredPlanet)?.[0] &&
                    planetSpeeds[
                      Object.entries(PLANET_DATA).find(([_, data]) => data.name === hoveredPlanet)![0]
                    ]?.toFixed(1)}
                  ×
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Distance:</span>
                <span className="font-mono text-purple-300">
                  {Object.entries(PLANET_DATA).find(([_, data]) => data.name === hoveredPlanet)?.[1].distance} AU
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 1px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        .compact-slider .relative {
          height: 4px;
        }
        .compact-slider [role="slider"] {
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          border: 1px solid white;
          box-shadow: 0 2px 6px rgba(96, 165, 250, 0.3);
        }
        .compact-slider [role="slider"]:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 8px rgba(96, 165, 250, 0.5);
        }
      `}</style>
    </div>
  )
}
