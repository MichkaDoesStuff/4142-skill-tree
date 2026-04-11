import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { graphManager } from './graphLogic.js'
import { GraphRenderer } from './graphRenderer.js'

// ============================================================================
// SCENE SETUP
// ============================================================================

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
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
camera.position.set(0, 40, 100)
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
controls.maxDistance = 200
controls.minDistance = 30

// ============================================================================
// RESPONSIVE DESIGN
// ============================================================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
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
// ANIMATION LOOP
// ============================================================================

function animate() {
  requestAnimationFrame(animate)
  controls.update()

  if (isDataLoaded) {
    graphRenderer.update()
  }
  
  // Notice we render the scene immediately even if data isn't loaded (so we see the background)
  graphRenderer.render()
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
  <h4 style="margin: 0 0 10px 0; color: #4ecdc4;">📊 Concept Graph</h4>
  <div style="line-height: 1.6;">
    <p><strong>🖱️ Navigate:</strong></p>
    <ul style="margin: 5px 0; padding-left: 15px;">
      <li>Rotate: Drag with mouse</li>
      <li>Zoom: Scroll wheel</li>
      <li>Select: Click a node</li>
      <li>Hover: Highlight nodes</li>
    </ul>
    <p><strong>🌌 Concepts:</strong></p>
    <ul style="margin: 5px 0; padding-left: 15px;">
      <li>🪨 Planets = Core concepts</li>
      <li>⭐ Stars = Related topics</li>
      <li>✨ Nested = Sub-topics</li>
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


