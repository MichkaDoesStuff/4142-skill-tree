/**
 * GRAPH RENDERER LAYER
 * 
 * Handles Three.js rendering and visualization.
 * Little Big Planet Style: Massive mapped planets, thick circular pads, 2D globe unroll.
 */

import * as THREE from 'three'
import { graphManager } from './graphLogic.js'

export class GraphRenderer {
  constructor(scene, camera, renderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    
    // Settings
    this.PLANET_RADIUS = 200
    this.PLANET_SPACING = 1500
    
    // Groups for organization
    this.mainGroup = new THREE.Group()
    this.scene.add(this.mainGroup)
    
    // Maps
    this.nodeMeshes = new Map()       
    this.planetClusters = [] // Holds the grouped planet+pads for scaling
    
    // State
    this.isMapMode = false
    this.unrollProgress = 0
    this.activePlanetIndex = 0
    this.coreNodeIds = [] 
    
    // Raycasting
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.hoveredMesh = null
    this.focusedNode = null
    
    // Animation
    this.animationClock = new THREE.Clock()
    
    // Gradients for planets
    this.planetColors = [
      { top: new THREE.Color(0xff7675), bottom: new THREE.Color(0x6c5ce7) }, // Pink to Purple
      { top: new THREE.Color(0xffb142), bottom: new THREE.Color(0xb33939) }, // Orange to Red
      { top: new THREE.Color(0x00cec9), bottom: new THREE.Color(0x0984e3) }, // Teal to Blue
    ]
    
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerClick = this.onPointerClick.bind(this)
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    
    // Drag State
    this.isDragging = false
    this.previousMousePosition = { x: 0, y: 0 }
    this.targetClusterQuat = null
    
    graphManager.onStateChange((eventType, payload) => {
      this.handleStateChange(eventType, payload)
    })
  }

  initialize(graphData) {
    this.createPlanets(graphData.nodes)
    this.attachEventListeners()
  }

  createPlanets(coreNodes) {
    this.coreNodeIds = coreNodes.map(n => n.id)
    
    const mapWidth = 2 * Math.PI * this.PLANET_RADIUS
    const mapHeight = Math.PI * this.PLANET_RADIUS
    
    coreNodes.forEach((node, index) => {
      // Create Cluster Group
      const cluster = new THREE.Group()
      
      const px = index * this.PLANET_SPACING
      const py = 0
      const pz = 0
      cluster.position.set(px, py, pz)
      cluster.userData = { index: index, basePos: new THREE.Vector3(px, py, pz) }
      
      this.planetClusters.push(cluster)
      this.mainGroup.add(cluster)

      // 1. Create Base Plane Geometry
      const geometry = new THREE.PlaneGeometry(mapWidth, mapHeight, 128, 64)
      
      const positions = geometry.attributes.position.array
      const flatPositions = new Float32Array(positions.length)
      const spherePositions = new Float32Array(positions.length)
      const colorArray = new Float32Array(positions.length)
      
      const pColorSet = this.planetColors[index % this.planetColors.length]

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]
        const y = positions[i+1]
        const z = positions[i+2]
        
        flatPositions[i] = x
        flatPositions[i+1] = y
        flatPositions[i+2] = z

        // Map to sphere (Equirectangular)
        const lon = x / this.PLANET_RADIUS
        const lat = y / this.PLANET_RADIUS
        
        const sx = this.PLANET_RADIUS * Math.cos(lat) * Math.sin(lon)
        const sy = this.PLANET_RADIUS * Math.sin(lat)
        const sz = this.PLANET_RADIUS * Math.cos(lat) * Math.cos(lon)
        
        spherePositions[i]   = sx
        spherePositions[i+1] = sy
        spherePositions[i+2] = sz
        
        // Colors
        const ratio = (y + mapHeight/2) / mapHeight
        const mixedColor = pColorSet.bottom.clone().lerp(pColorSet.top, ratio)
        colorArray[i] = mixedColor.r
        colorArray[i+1] = mixedColor.g
        colorArray[i+2] = mixedColor.b
      }

      // Base shape is the SPHERE
      geometry.setAttribute('position', new THREE.BufferAttribute(spherePositions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
      geometry.computeVertexNormals()

      // Morph Target 1: FLAT PLANE
      geometry.morphAttributes.position = []
      geometry.morphAttributes.position[0] = new THREE.BufferAttribute(flatPositions, 3)

      // Compute flat normals for accurate lighting during morph
      const flatGeo = new THREE.BufferGeometry()
      flatGeo.setAttribute('position', new THREE.BufferAttribute(flatPositions, 3))
      flatGeo.setIndex(geometry.getIndex())
      flatGeo.computeVertexNormals()
      
      geometry.morphAttributes.normal = []
      geometry.morphAttributes.normal[0] = flatGeo.getAttribute('normal')

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
      })
      
      const planet = new THREE.Mesh(geometry, material)
      planet.name = node.id
      planet.userData = { nodeId: node.id, isPlanet: true }
      
      cluster.add(planet)
      this.nodeMeshes.set(node.id, planet)
      
      if (node.children && node.children.length > 0) {
        this.createSurfacePads(node, cluster)
      }
    })
  }

  createSurfacePads(parentNode, cluster) {
    const flatSubNodes = this.flattenChildNodes(parentNode.children)
    const count = flatSubNodes.length
    const goldenRatio = (1 + Math.sqrt(5)) / 2
    
    flatSubNodes.forEach((node, index) => {
      // Map to sphere coordinates
      const theta = 2 * Math.PI * index / goldenRatio
      const phi = Math.acos(1 - 2 * (index + 0.5) / count)
      
      let lat = Math.PI/2 - phi // -PI/2 to PI/2
      let lon = theta % (2 * Math.PI)
      if (lon > Math.PI) lon -= 2 * Math.PI // -PI to PI
      
      // Calculate Flat Map Position (Local to Cluster)
      const fX = lon * this.PLANET_RADIUS
      const fY = lat * this.PLANET_RADIUS
      const padHeight = 2.0
      
      const flatNormal = new THREE.Vector3(0, 0, 1)
      const flatPos = new THREE.Vector3(fX, fY, (padHeight / 2))
      
      // Calculate Spherical Position (Local to Cluster)
      const sX = this.PLANET_RADIUS * Math.cos(lat) * Math.sin(lon)
      const sY = this.PLANET_RADIUS * Math.sin(lat)
      const sZ = this.PLANET_RADIUS * Math.cos(lat) * Math.cos(lon)
      
      const sphereNormal = new THREE.Vector3(sX, sY, sZ).normalize()
      const spherePos = new THREE.Vector3(sX, sY, sZ)
      spherePos.add(sphereNormal.clone().multiplyScalar(padHeight / 2))
      
      // Create thick Pad (Cylinder)
      const padRadius = 8
      const geometry = new THREE.CylinderGeometry(padRadius, padRadius, padHeight, 32)
      
      const up = new THREE.Vector3(0, 1, 0)
      const sphereQuat = new THREE.Quaternion().setFromUnitVectors(up, sphereNormal)
      const flatQuat = new THREE.Quaternion().setFromUnitVectors(up, flatNormal)
      
      const material = new THREE.MeshStandardMaterial({
        color: node.metadata?.color || 0xf5f6fa,
        roughness: 0.3,
        metalness: 0.0,
        emissive: 0x000000,
      })
      const padMesh = new THREE.Mesh(geometry, material)
      
      padMesh.position.copy(spherePos)
      padMesh.quaternion.copy(sphereQuat)
      padMesh.name = node.id
      padMesh.userData = { 
        nodeId: node.id, 
        spherePos: spherePos,
        flatPos: flatPos,
        sphereQuat: sphereQuat,
        flatQuat: flatQuat,
        baseScale: 1,
        sphereNormal: sphereNormal.clone()
      }
      
      cluster.add(padMesh)
      this.nodeMeshes.set(node.id, padMesh)
    })
  }
  
  flattenChildNodes(children, depth = 0) {
    let result = []
    children.forEach(c => {
      result.push({ ...c, depth })
      if (c.children && c.children.length > 0) {
        result = result.concat(this.flattenChildNodes(c.children, depth + 1))
      }
    })
    return result
  }

  toggleMapView() {
    this.isMapMode = !this.isMapMode
    if (this.isMapMode) {
        this.forceResetRotations()
    }
  }
  
  getActivePlanetPosition() {
    return new THREE.Vector3(this.activePlanetIndex * this.PLANET_SPACING, 0, 0)
  }

  nextPlanet() {
    this.activePlanetIndex = Math.min(this.activePlanetIndex + 1, this.coreNodeIds.length - 1)
    this.isMapMode = false
    this.forceResetRotations()
  }

  prevPlanet() {
    this.activePlanetIndex = Math.max(this.activePlanetIndex - 1, 0)
    this.isMapMode = false
    this.forceResetRotations()
  }
  
  forceResetRotations() {
    this.planetClusters.forEach(c => {
        c.rotation.set(0, 0, 0)
        c.quaternion.identity()
    })
    this.targetClusterQuat = null
  }

  onPointerDown(event) {
     if (window.APP_STATE !== 'SELECTED' || this.isMapMode) return;
     this.isDragging = true;
     this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }
  
  onPointerUp(event) {
     this.isDragging = false;
  }

  onPointerMove(event) {
    if (this.isDragging && window.APP_STATE === 'SELECTED' && !this.isMapMode) {
        const deltaMove = {
            x: event.clientX - this.previousMousePosition.x,
            y: event.clientY - this.previousMousePosition.y
        }
        
        const cluster = this.planetClusters[this.activePlanetIndex]
        if (cluster) {
            cluster.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaMove.x * 0.005)
            cluster.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), deltaMove.y * 0.005)
        }
        
        this.previousMousePosition = { x: event.clientX, y: event.clientY }
    }

    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    this.raycaster.setFromCamera(this.pointer, this.camera)
    // Raycast only meshes, not groups
    const intersects = this.raycaster.intersectObjects(this.mainGroup.children, true)
    
    // In BROWSING mode, ignore pad hover logic
    if (window.APP_STATE === 'BROWSING') {
        if (this.hoveredMesh && !this.hoveredMesh.userData.isPlanet) {
            this.hoveredMesh.userData.baseScale = 1
            this.hoveredMesh = null
        }
        return
    }

    if (this.hoveredMesh && (!intersects.length || intersects[0].object !== this.hoveredMesh)) {
        if (!this.hoveredMesh.userData.isPlanet) {
            this.hoveredMesh.userData.baseScale = 1
        }
    }
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object
      if (mesh.userData && !mesh.userData.isPlanet) {
          this.hoveredMesh = mesh
          this.hoveredMesh.userData.baseScale = 1.3
      } else {
        this.hoveredMesh = null
      }
    } else {
      this.hoveredMesh = null
    }
  }

  onPointerClick(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const intersects = this.raycaster.intersectObjects(this.mainGroup.children, true)
    
    if (intersects.length > 0 && intersects[0].object.userData) {
      const mesh = intersects[0].object
      
      // Prevent child node selection during browsing
      if (window.APP_STATE === 'BROWSING' && !mesh.userData.isPlanet) return;
      
      const nodeId = mesh.userData.nodeId
      
      if (!mesh.userData.isPlanet) {
          window.setAppState && window.setAppState('CHILD_NODE_SELECTED')
          const sNormal = mesh.userData.sphereNormal;
          if (sNormal) {
             this.targetClusterQuat = new THREE.Quaternion().setFromUnitVectors(sNormal, new THREE.Vector3(0, 0, 1))
          }
      }
      
      if (this.focusedNode === nodeId) {
        graphManager.deselectNode()
        this.focusedNode = null
      } else {
        graphManager.selectNode(nodeId)
        this.focusedNode = nodeId
      }
    }
  }

  attachEventListeners() {
    document.addEventListener('pointermove', this.onPointerMove)
    document.addEventListener('pointerdown', this.onPointerDown)
    document.addEventListener('pointerup', this.onPointerUp)
    document.addEventListener('click', this.onPointerClick)
  }

  detachEventListeners() {
    document.removeEventListener('pointermove', this.onPointerMove)
    document.removeEventListener('pointerdown', this.onPointerDown)
    document.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('click', this.onPointerClick)
  }

  handleStateChange(eventType, payload) {
    if (eventType === 'nodeSelected') {
      this.onNodeSelected(payload.nodeId)
    }
  }

  onNodeSelected(nodeId) {
    for (const mesh of this.nodeMeshes.values()) {
      if (!mesh.userData.isPlanet) {
          mesh.material.emissive.setHex(0x000000)
      }
    }
    
    if (nodeId) {
      const mesh = this.nodeMeshes.get(nodeId)
      if (mesh && !mesh.userData.isPlanet) {
        mesh.material.emissive.setHex(0x444444)
      }
    }
  }

  update() {
    const time = this.animationClock.getElapsedTime()
    const targetProgress = this.isMapMode ? 1.0 : 0.0
    this.unrollProgress += (targetProgress - this.unrollProgress) * 0.06
    
    // Update Clusters (Background scaling/shifting for orthogonal 2.5d effect)
    this.planetClusters.forEach(cluster => {
        const distanceIndex = this.activePlanetIndex - cluster.userData.index
        const isTrailing = distanceIndex > 0
        const isActive = distanceIndex === 0
        
        // Handle Auto-Rotation and Snapping
        if (!this.isMapMode) {
             if (window.APP_STATE === 'BROWSING') {
                  cluster.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.003)
                  cluster.quaternion.slerp(new THREE.Quaternion(), 0.05) // Smoothly fix any wonky off-axis rotation natively
             } else if (window.APP_STATE === 'SELECTED' && !this.isDragging) {
                  if (isActive) cluster.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.0008)
             } else if (window.APP_STATE === 'CHILD_NODE_SELECTED' && isActive && this.targetClusterQuat) {
                  cluster.quaternion.slerp(this.targetClusterQuat, 0.06)
             }
        }
        
        // Depth scale & background limiting
        // We only show a maximum of two trailing planets
        let targetScale = 1.0;
        let dimOpacity = 1.0;
        let isVisible = true;
        
        if (isActive) {
           targetScale = 1.0;
           dimOpacity = 1.0;
        } else if (isTrailing) {
           if (distanceIndex > 2) {
               isVisible = false;
               dimOpacity = 0.0;
               targetScale = 0.001; // Hide immediately past 2 planets
           } else {
               targetScale = 0.35 - (distanceIndex * 0.05); // slightly smaller further back
               dimOpacity = 0.4 - (distanceIndex * 0.15);
           }
        } else {
           isVisible = false;
           dimOpacity = 0.0;
           targetScale = 0.001;
        }

        cluster.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08)
        
        const targetPos = cluster.userData.basePos.clone()
        if (isTrailing && isVisible) {
             const activeX = this.activePlanetIndex * this.PLANET_SPACING;
             // Force X coordinate closer so they actually fit on the left of the screen!
             const offsetFromActive = distanceIndex === 1 ? -650 : -950;
             
             targetPos.x = activeX + offsetFromActive;
             targetPos.y += 150 + (distanceIndex * 30)  // Shift progressively up
             targetPos.z -= 100 * distanceIndex          // Shift progressively back
        }
        cluster.position.lerp(targetPos, 0.08)
        
        // Dim trailing planets
        cluster.children.forEach(mesh => {
            if (mesh.material) {
                if (mesh.material.emissiveIntensity === undefined) {
                    mesh.material.emissiveIntensity = 0;
                }
                if (mesh.material.transparent !== true) {
                    mesh.material.transparent = true;
                    mesh.material.needsUpdate = true;
                }
                mesh.material.opacity += (dimOpacity - mesh.material.opacity) * 0.1
            }
        })
    })

    // Update Individual Meshes
    for (const mesh of this.nodeMeshes.values()) {
      const pIdx = mesh.parent?.userData?.index;
      const isActivePlanet = (pIdx === this.activePlanetIndex);
      
      if (mesh.userData.isPlanet) {
          if (mesh.morphTargetInfluences) {
              mesh.morphTargetInfluences[0] = isActivePlanet ? this.unrollProgress : 0;
          }
      } else {
        const sPos = mesh.userData.spherePos
        const fPos = mesh.userData.flatPos
        const sQuat = mesh.userData.sphereQuat
        const fQuat = mesh.userData.flatQuat
        
        if (sPos && fPos) mesh.position.lerpVectors(sPos, fPos, isActivePlanet ? this.unrollProgress : 0)
        if (sQuat && fQuat) mesh.quaternion.slerpQuaternions(sQuat, fQuat, isActivePlanet ? this.unrollProgress : 0)
        
        const targetScale = mesh.userData.baseScale || 1
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15)
        
        if (this.focusedNode === mesh.userData.nodeId) {
            mesh.material.emissiveIntensity = 0.5 + Math.sin(time * 5) * 0.3;
        }
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }
}

