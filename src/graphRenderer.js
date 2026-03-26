/**
 * GRAPH RENDERER LAYER
 * 
 * Handles Three.js rendering and visualization (exploration-based).
 * Listens to graph state changes and updates visuals accordingly.
 */

import * as THREE from 'three'
import { graphManager } from './graphLogic.js'

export class GraphRenderer {
  constructor(scene, camera, renderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    
    // Groups for organization
    this.planetGroup = new THREE.Group()
    this.starGroup = new THREE.Group()
    this.edgeGroup = new THREE.Group()
    this.scene.add(this.planetGroup, this.starGroup, this.edgeGroup)
    
    // Maps for tracking meshes
    this.nodeMeshes = new Map()       // nodeId -> mesh
    this.nodeOrbitals = new Map()     // nodeId -> array of child meshes
    this.edgeLines = new Map()        // edgeId -> line mesh
    
    // Raycasting for interaction
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.hoveredMesh = null
    
    // Animation state
    this.focusedNode = null
    this.animationClock = new THREE.Clock()
    
    // Bind callbacks
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerClick = this.onPointerClick.bind(this)
    
    // Listen to graph state changes
    graphManager.onStateChange((eventType, payload) => {
      this.handleStateChange(eventType, payload)
    })
  }

  /**
   * Initialize rendering: create planets in a line, then populate stars
   */
  initialize(graphData) {
    this.createPlanets(graphData.nodes)
    this.createEdges(graphData.edges)
    this.attachEventListeners()
  }

  /**
   * Create planet meshes in a line along X axis
   */
  createPlanets(coreNodes) {
    const spacing = 50
    const planetRadius = 5
    
    coreNodes.forEach((node, index) => {
      // Create planet sphere
      const geometry = new THREE.SphereGeometry(planetRadius, 32, 32)
      const material = new THREE.MeshStandardMaterial({
        color: node.metadata?.color || 0x6c5ce7,
        roughness: 0.4,
        metalness: 0.3
      })
      const planet = new THREE.Mesh(geometry, material)
      
      // Position in a line
      planet.position.x = -60 + index * spacing
      planet.position.y = 0
      planet.position.z = 0
      
      planet.name = node.id
      planet.userData = { nodeId: node.id, depth: 0 }
      
      this.planetGroup.add(planet)
      this.nodeMeshes.set(node.id, planet)
      
      // Add stars around this planet
      if (node.children && node.children.length > 0) {
        this.createOrbitalStars(node, planet, 1)
      }
    })
  }

  /**
   * Recursively create stars orbiting a parent node
   * depth controls the recursion level and visual hierarchy
   */
  createOrbitalStars(parentNode, parentMesh, depth) {
    const baseOrbitRadius = 15 + depth * 5
    const childCount = parentNode.children.length
    
    parentNode.children.forEach((star, index) => {
      // Distribute around parent in a sphere orbit
      const angle = (index / childCount) * Math.PI * 2
      const tilt = depth * 0.3 // Tilt orbits by recursion depth
      
      const x = parentMesh.position.x + Math.cos(angle) * baseOrbitRadius
      const y = Math.sin(angle) * baseOrbitRadius * Math.sin(tilt)
      const z = Math.sin(angle) * baseOrbitRadius * Math.cos(tilt)
      
      // Create star (scaled down with depth)
      const starRadius = Math.max(1.5 - depth * 0.4, 0.5)
      const geometry = new THREE.SphereGeometry(starRadius, 16, 16)
      const material = new THREE.MeshStandardMaterial({
        color: star.metadata?.color || 0xcccccc,
        roughness: 0.5,
        metalness: 0.2
      })
      const starMesh = new THREE.Mesh(geometry, material)
      
      starMesh.position.set(x, y, z)
      starMesh.name = star.id
      starMesh.userData = { nodeId: star.id, parentId: parentNode.id, depth }
      
      this.starGroup.add(starMesh)
      this.nodeMeshes.set(star.id, starMesh)
      
      // Add children recursively
      if (star.children && star.children.length > 0) {
        this.createOrbitalStars(star, starMesh, depth + 1)
      }
    })
  }

  /**
   * Create edge lines between connected nodes (subtle glowing arcs)
   */
  createEdges(edges) {
    edges.forEach((edge, index) => {
      const fromMesh = this.nodeMeshes.get(edge.from)
      const toMesh = this.nodeMeshes.get(edge.to)
      
      if (!fromMesh || !toMesh) return
      
      // Create a curved path using CatmullRomCurve3
      const start = fromMesh.position.clone()
      const end = toMesh.position.clone()
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(50)
      
      const curve = new THREE.CatmullRomCurve3([start, mid, end])
      const points = curve.getPoints(30)
      
      // Create subtle glowing line
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      })
      const line = new THREE.Line(geometry, material)
      
      this.edgeGroup.add(line)
      this.edgeLines.set(`${edge.from}-${edge.to}`, line)
    })
  }

  /**
   * Handle pointer move for hover highlighting
   */
  onPointerMove(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const allMeshes = Array.from(this.nodeMeshes.values())
    const intersects = this.raycaster.intersectObjects(allMeshes)
    
    // Reset previous hover
    if (this.hoveredMesh) {
      this.hoveredMesh.scale.set(1, 1, 1)
    }
    
    // Set new hover
    if (intersects.length > 0) {
      this.hoveredMesh = intersects[0].object
      this.hoveredMesh.scale.set(1.2, 1.2, 1.2)
    } else {
      this.hoveredMesh = null
    }
  }

  /**
   * Handle pointer click for node selection
   */
  onPointerClick(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const allMeshes = Array.from(this.nodeMeshes.values())
    const intersects = this.raycaster.intersectObjects(allMeshes)
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object
      const nodeId = mesh.userData.nodeId
      
      // Toggle selection
      if (this.focusedNode === nodeId) {
        graphManager.deselectNode()
        this.focusedNode = null
        mesh.material.emissive.setHex(0x000000)
      } else {
        graphManager.selectNode(nodeId)
        this.focusedNode = nodeId
      }
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    document.addEventListener('mousemove', this.onPointerMove)
    document.addEventListener('click', this.onPointerClick)
  }

  /**
   * Remove event listeners (cleanup)
   */
  detachEventListeners() {
    document.removeEventListener('mousemove', this.onPointerMove)
    document.removeEventListener('click', this.onPointerClick)
  }

  /**
   * Handle state changes from graph manager
   */
  handleStateChange(eventType, payload) {
    if (eventType === 'nodeSelected') {
      this.onNodeSelected(payload.nodeId)
    }
  }

  /**
   * Update visuals when a node is selected
   */
  onNodeSelected(nodeId) {
    // Clear all highlights first
    for (const mesh of this.nodeMeshes.values()) {
      mesh.material.emissive.setHex(0x000000)
    }
    
    // Highlight selected node if exists
    if (nodeId) {
      const mesh = this.nodeMeshes.get(nodeId)
      if (mesh) {
        mesh.material.emissive.setHex(0x444444)
      }
    }
  }

  /**
   * Animation loop update (called from main)
   */
  update() {
    // Subtle animation of focused node
    if (this.focusedNode) {
      const mesh = this.nodeMeshes.get(this.focusedNode)
      if (mesh) {
        const time = this.animationClock.getElapsedTime()
        mesh.scale.setScalar(1.3 + Math.sin(time * 3) * 0.1)
      }
    }
  }

  /**
   * Render scene
   */
  render() {
    this.renderer.render(this.scene, this.camera)
  }
}
