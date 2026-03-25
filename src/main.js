import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { skillNodes, latLonToVector3 } from './skillTreeData.js'
import earthMap from './assets/earth_mapping.jpg'
import earthNormalMap from './assets/earth_normal_mapping.png'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), alpha: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
camera.position.set(0, 15, 40)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const sceneGroup = new THREE.Group()
scene.add(sceneGroup)

const earthTexture = new THREE.TextureLoader().load(earthMap);
const earthNormalTexture = new THREE.TextureLoader().load(earthNormalMap);

const earthRadius = 15
const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64)
const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  normalMap: earthNormalTexture,
  normalScale: new THREE.Vector2(3,3)
})
const earth = new THREE.Mesh(earthGeometry, earthMaterial)
sceneGroup.add(earth)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
const pointLight = new THREE.PointLight(0xffffff, 1)
pointLight.position.set(25,25,25)
scene.add(ambientLight, pointLight)

const nodeGroup = new THREE.Group()
const edgeGroup = new THREE.Group()
sceneGroup.add(edgeGroup, nodeGroup)

const statusColor = {
  mastered: 0x00ff88,
  inprogress: 0xffc100,
  locked: 0xff4455,
}

const nodeMeshes = new Map()

function createNode(node) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 12, 12),
    new THREE.MeshBasicMaterial({ color: statusColor[node.status] || 0xffffff })
  )

  mesh.position.copy(latLonToVector3(node.lat, node.lon, earthRadius + 1.1))
  mesh.name = node.id
  mesh.userData = node
  nodeGroup.add(mesh)
  nodeMeshes.set(node.id, mesh)
}

function createEdge(fromId, toId) {
  const from = nodeMeshes.get(fromId)
  const to = nodeMeshes.get(toId)
  if (!from || !to) return

  const mid = from.position.clone().add(to.position).multiplyScalar(0.5).normalize().multiplyScalar(earthRadius + 2)
  const curve = new THREE.CatmullRomCurve3([from.position, mid, to.position])
  const points = curve.getPoints(40)

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
  )
  edgeGroup.add(line)
}

skillNodes.forEach(createNode)
skillNodes.forEach(node => node.dependsOn.forEach(prev => createEdge(prev, node.id)))

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let hoveredMesh = null

const infoBox = document.getElementById('info')

function addStar(){
  const geometry = new THREE.SphereGeometry(0.25, 24, 24);
  const material = new THREE.MeshStandardMaterial({color:0xf9eacd})
  const star = new THREE.Mesh(geometry, material);

  const[x,y,z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100))
  star.position.set(x,y,z)
  scene.add(star)
}

Array(200).fill().forEach(addStar)

function updateInfo(node) {
  if (!infoBox) return
  if (!node) {
    infoBox.innerHTML = '<strong>Hover a node</strong> to see details.'
    return
  }

  infoBox.innerHTML = `
    <strong>${node.title}</strong><br>
    Category: ${node.category}<br>
    Status: ${node.status}<br>
    Dependencies: ${node.dependsOn.length ? node.dependsOn.join(', ') : 'None'}
  `
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(Array.from(nodeMeshes.values()))

  if (intersects.length > 0) {
    const mesh = intersects[0].object
    if (hoveredMesh !== mesh) {
      if (hoveredMesh) {
        hoveredMesh.scale.setScalar(1)
      }
      hoveredMesh = mesh
      hoveredMesh.scale.setScalar(1.45)
      updateInfo(hoveredMesh.userData)
    }
  } else {
    if (hoveredMesh) {
      hoveredMesh.scale.setScalar(1)
      hoveredMesh = null
      updateInfo(null)
    }
  }
}

function onClick() {
  if (hoveredMesh) {
    const n = hoveredMesh.userData
    alert(`${n.title}\nCategory: ${n.category}\nStatus: ${n.status}\nPrerequisites: ${n.dependsOn.join(', ') || 'None'}`)
  }
}

window.addEventListener('pointermove', onPointerMove)
window.addEventListener('click', onClick)

updateInfo(null)

function animate() {
  requestAnimationFrame(animate)
  sceneGroup.rotation.y += 0.00045
  sceneGroup.rotation.x += 0.0001

  controls.update()
  renderer.render(scene, camera)
}

animate()


