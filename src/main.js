import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { graphManager } from './graphLogic.js'
import { GraphRenderer } from './graphRenderer.js'

// ============================================================================
// SCENE SETUP
// ============================================================================

const scene = new THREE.Scene()
const aspect = window.innerWidth / window.innerHeight
const frustumSize = 1000
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  10000
)
const renderer = new THREE.WebGLRenderer({ 
  canvas: document.querySelector('#bg'), 
  alpha: true,
  antialias: true 
})

renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
scene.background = new THREE.Color(0x0a0e27)

// Camera positioning
camera.position.set(0, 0, 1000)
camera.lookAt(0, 0, 0)

// ============================================================================
// LIGHTING
// ============================================================================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
const pointLight = new THREE.PointLight(0xffffff, 1.2)
pointLight.position.set(50, 50, 50)
pointLight.castShadow = true

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(-30, 40, 30)
directionalLight.castShadow = true

scene.add(ambientLight, pointLight, directionalLight)

// ============================================================================
// CONTROLS
// ============================================================================

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.autoRotate = false
// Lock pan/zoom for Planet Mode
controls.enableZoom = false
controls.enablePan = false

// ============================================================================
// RESPONSIVE DESIGN
// ============================================================================

window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight
  // Base bounds
  const baseLeft = -frustumSize * aspect / 2
  const baseRight = frustumSize * aspect / 2
  
  // Apply any active camera shift
  camera.left = baseLeft - cameraShiftX
  camera.right = baseRight - cameraShiftX
  camera.top = frustumSize / 2
  camera.bottom = -frustumSize / 2
  
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ============================================================================
// INITIALIZE GRAPH RENDERER & FETCH DATA
// ============================================================================

const graphRenderer = new GraphRenderer(scene, camera, renderer)

// Create a Loading Overlay
const loadingOverlay = document.createElement('div')
loadingOverlay.id = 'loading-overlay'
loadingOverlay.style.cssText = `
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #4ecdc4;
  font-family: 'Courier New', monospace;
  font-size: 24px;
  font-weight: bold;
  pointer-events: none;
`
loadingOverlay.textContent = 'Connecting to AuraDB... Loading Neural Pathways...'
document.body.appendChild(loadingOverlay)

let isDataLoaded = false

async function loadGraphData() {
  try {
    const res = await fetch('http://localhost:3000/api/graph');
    if (!res.ok) throw new Error("Failed to fetch");
    const dbData = await res.json();
    
    // Inject the data into the logic manager and renderer
    graphManager.setData(dbData)
    graphRenderer.initialize(dbData)
    
    // Remove loading overlay
    document.body.removeChild(loadingOverlay)
    isDataLoaded = true
    
    console.log('✅ Graph Renderer initialized with', dbData.nodes.length, 'core nodes')
    console.log('📍 Graph edges:', dbData.edges.length)
  } catch (error) {
    loadingOverlay.textContent = '❌ Error Connecting to Database :('
    loadingOverlay.style.color = '#ff6b6b'
    console.error(error)
  }
}

loadGraphData()

// ============================================================================
// APP STATE & UI
// ============================================================================

window.APP_STATE = 'BROWSING'

// UI Navigation
const navContainer = document.createElement('div')
navContainer.id = 'lbp-nav'
document.body.appendChild(navContainer)

const prevBtn = document.createElement('button')
prevBtn.textContent = '◀ Previous Planet'
prevBtn.className = 'lbp-btn'

const selectBtn = document.createElement('button')
selectBtn.textContent = 'Select Planet'
selectBtn.className = 'lbp-btn select-btn'

const backBtn = document.createElement('button')
backBtn.textContent = '◀ Back to Browsing'
backBtn.className = 'lbp-btn'

const childBackBtn = document.createElement('button')
childBackBtn.textContent = '◀ Return to Selection'
childBackBtn.className = 'lbp-btn'

const mapToggleBtn = document.createElement('button')
mapToggleBtn.innerHTML = '🗺️ Unroll Map'
mapToggleBtn.className = 'lbp-btn primary-btn'

const nextBtn = document.createElement('button')
nextBtn.textContent = 'Next Planet ▶'
nextBtn.className = 'lbp-btn'

navContainer.appendChild(prevBtn)
navContainer.appendChild(selectBtn)
navContainer.appendChild(mapToggleBtn)
navContainer.appendChild(childBackBtn)
navContainer.appendChild(backBtn)
navContainer.appendChild(nextBtn)

window.setAppState = (state) => {
    window.APP_STATE = state
    updateUI()
}

function updateUI() {
  if (window.APP_STATE === 'BROWSING') {
    prevBtn.style.display = 'block'
    nextBtn.style.display = 'block'
    selectBtn.style.display = 'block'
    mapToggleBtn.style.display = 'none'
    backBtn.style.display = 'none'
    childBackBtn.style.display = 'none'
    
    controls.enableRotate = false
    controls.enableZoom = false
    controls.enablePan = false
  } else if (window.APP_STATE === 'SELECTED' || window.APP_STATE === 'CHILD_NODE_SELECTED') {
    prevBtn.style.display = 'none'
    nextBtn.style.display = 'none'
    selectBtn.style.display = 'none'
    mapToggleBtn.style.display = 'block'
    backBtn.style.display = 'block'
    childBackBtn.style.display = window.APP_STATE === 'CHILD_NODE_SELECTED' ? 'block' : 'none'
    
    // Custom rotation is via drag on canvas
    controls.enableRotate = false 
    if (graphRenderer.isMapMode) {
      controls.enableZoom = true
      controls.enablePan = true
      // Map mode uses left-click to pan!
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN
    } else {
      controls.enableZoom = false
      controls.enablePan = false
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
    }
  }
}

prevBtn.onclick = () => { graphRenderer.prevPlanet(); updateUI() }
nextBtn.onclick = () => { graphRenderer.nextPlanet(); updateUI() }

selectBtn.onclick = () => {
    window.setAppState('SELECTED')
}

backBtn.onclick = () => {
    if (graphRenderer.isMapMode) {
        graphRenderer.toggleMapView()
        mapToggleBtn.innerHTML = '🗺️ Unroll Map'
    }
    graphRenderer.forceResetRotations()
    graphManager.deselectNode()
    window.setAppState('BROWSING')
}

childBackBtn.onclick = () => {
    graphManager.deselectNode()
    graphRenderer.targetClusterQuat = null
    window.setAppState('SELECTED')
}

mapToggleBtn.onclick = () => {
  graphRenderer.toggleMapView()
  mapToggleBtn.innerHTML = graphRenderer.isMapMode ? '🌍 Return to Planet' : '🗺️ Unroll Map'
  
  updateUI()
}

updateUI()

// ============================================================================
// ANIMATION LOOP
// ============================================================================

let cameraShiftX = 0

function animate() {
  requestAnimationFrame(animate)

  if (isDataLoaded) {
    const activePlanetPos = graphRenderer.getActivePlanetPosition()
    
    const prevTarget = controls.target.clone()
    
        // In Map Mode, we stop forcing the target to the planet so the user can pan freely.
    if (!graphRenderer.isMapMode) {
        controls.target.lerp(activePlanetPos, 0.08)
        
        // Dynamic Zoom: zoom into the planet when selected
        const targetZoom = (window.APP_STATE === 'SELECTED' || window.APP_STATE === 'CHILD_NODE_SELECTED') ? 1.6 : 1.0
        camera.zoom += (targetZoom - camera.zoom) * 0.08
    } else {
        // Enforce Min/Max Zoom bounds in Map Mode so they don't get lost in void
        if (camera.zoom < 0.6) camera.zoom = 0.6;
        if (camera.zoom > 5.0) camera.zoom = 5.0;
        
        // Clamp Map Boundaries
        const mapWidth = 2 * Math.PI * 200 // 1256
        const mapHeight = Math.PI * 200    // 628
        const aspect = window.innerWidth / window.innerHeight;
        
        const viewWidth = (frustumSize * aspect) / camera.zoom;
        const viewHeight = frustumSize / camera.zoom;
        
        const maxOffsetX = Math.max(0, (mapWidth / 2) - (viewWidth / 2));
        const maxOffsetY = Math.max(0, (mapHeight / 2) - (viewHeight / 2));
        
        const minX = activePlanetPos.x - maxOffsetX;
        const maxX = activePlanetPos.x + maxOffsetX;
        const minY = activePlanetPos.y - maxOffsetY;
        const maxY = activePlanetPos.y + maxOffsetY;
        
        controls.target.x = Math.max(minX, Math.min(maxX, controls.target.x));
        controls.target.y = Math.max(minY, Math.min(maxY, controls.target.y));
    }
    
    // Shift camera along with the target smoothly
    const delta = controls.target.clone().sub(prevTarget)
    camera.position.add(delta)
    
    // Force frontal view during Map Mode
    if (graphRenderer.isMapMode) {
        const frontalPos = controls.target.clone().add(new THREE.Vector3(0, 0, 1000))
        camera.position.lerp(frontalPos, 0.08)
    }
    
    // Handle view shifting to frame active planet on the right
    const aspect = window.innerWidth / window.innerHeight
    
    // Center if Map Mode or in any kind of Selection mode
    const isCentered = graphRenderer.isMapMode || window.APP_STATE === 'SELECTED' || window.APP_STATE === 'CHILD_NODE_SELECTED'
    const targetShiftX = isCentered ? 0 : (frustumSize * aspect * 0.25)
    
    cameraShiftX += (targetShiftX - cameraShiftX) * 0.08
    
    const baseLeft = -frustumSize * aspect / 2
    const baseRight = frustumSize * aspect / 2
    camera.left = baseLeft - cameraShiftX
    camera.right = baseRight - cameraShiftX
    camera.updateProjectionMatrix()

    graphRenderer.update()
  }

  controls.update()
  
  // Notice we render the scene immediately even if data isn't loaded (so we see the background)
  if (graphRenderer) graphRenderer.render()
}

animate()

// ============================================================================
// UI OVERLAY (Info Panel)
// ============================================================================

const infoPanel = document.createElement('div')
infoPanel.id = 'info-panel'
infoPanel.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  max-height: 500px;
  background: rgba(10, 14, 39, 0.95);
  border: 2px solid #6c5ce7;
  border-radius: 8px;
  padding: 20px;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  overflow-y: auto;
  display: none;
  z-index: 100;
  box-shadow: 0 0 20px rgba(108, 92, 231, 0.3);
`
document.body.appendChild(infoPanel)

// Update UI when node is selected
graphManager.onStateChange((eventType, payload) => {
  if (eventType === 'nodeSelected' && payload.nodeId) {
    const allNodes = flattenNodes(graphManager.data.nodes)
    const node = allNodes.find(n => n.id === payload.nodeId)
    
    if (node) {
      infoPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #00ff88;">${node.label}</h3>
        <p style="margin: 5px 0;"><strong>ID:</strong> ${node.id}</p>
        <p style="margin: 5px 0;"><strong>Category:</strong> ${node.category}</p>
        ${node.metadata?.description ? `<p style="margin: 5px 0; font-style: italic; color: #aaaaaa;">${node.metadata.description}</p>` : ''}
        ${node.children && node.children.length > 0 ? `<p style="margin-top: 10px; color: #6c5ce7;"><strong>Contains ${node.children.length} related concept(s)</strong></p>` : ''}
      `
      infoPanel.style.display = 'block'
    }
  } else if (eventType === 'nodeSelected' && !payload.nodeId) {
    infoPanel.style.display = 'none'
  }
})

// ============================================================================
// INSTRUCTIONS & HELP
// ============================================================================

const instructionsPanel = document.createElement('div')
instructionsPanel.id = 'instructions'
instructionsPanel.style.cssText = `
  position: fixed;
  top: 20px;
  left: 20px;
  width: 300px;
  background: rgba(10, 14, 39, 0.9);
  border: 2px solid #4ecdc4;
  border-radius: 8px;
  padding: 15px;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  z-index: 100;
  box-shadow: 0 0 15px rgba(78, 205, 196, 0.2);
`
instructionsPanel.innerHTML = `
  <h4 style="margin: 0 0 10px 0; color: #4ecdc4;">🪐 Little Big Tree</h4>
  <div style="line-height: 1.6;">
    <p><strong>🖱️ Navigate:</strong></p>
    <ul style="margin: 5px 0; padding-left: 15px;">
      <li>Rotate: Drag with mouse on planets</li>
      <li>Switch Planets: Bottom Arrows</li>
      <li>Unroll Map: Bottom Center Button</li>
      <li>Select: Click a node</li>
    </ul>
  </div>
`
document.body.appendChild(instructionsPanel)

// Helper function to flatten nested nodes
function flattenNodes(nodes) {
  let flat = []
  for (const node of nodes) {
    flat.push(node)
    if (node.children && node.children.length > 0) {
      flat = flat.concat(flattenNodes(node.children))
    }
  }
  return flat
}


