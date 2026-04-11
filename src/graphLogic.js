/**
 * GRAPH LOGIC LAYER
 * 
 * Handles graph traversal and interaction logic (exploration-based, no progression).
 * Generic operations that don't depend on rendering or progression state.
 */


export class GraphManager {
  constructor() {
    this.data = { nodes: [], edges: [] }
    this.selectedNode = null
    this.stateChangedCallbacks = []
  }

  setData(newData) {
    this.data = newData;
  }

  /**
   * Select a node and trigger state updates
   */
  selectNode(nodeId) {
    this.selectedNode = nodeId
    this.emitStateChange('nodeSelected', { nodeId })
  }

  /**
   * Deselect current node
   */
  deselectNode() {
    this.selectedNode = null
    this.emitStateChange('nodeSelected', { nodeId: null })
  }

  /**
   * Get parent node of a given node (recursive search)
   */
  getParent(nodeId, nodes = this.data.nodes, parent = null) {
    for (const node of nodes) {
      if (node.id === nodeId) return parent
      if (node.children && node.children.length > 0) {
        const found = this.getParent(nodeId, node.children, node)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Get all ancestors of a node (path to root)
   */
  getAncestors(nodeId) {
    const ancestors = []
    let current = this.getParent(nodeId)
    while (current) {
      ancestors.unshift(current)
      current = this.getParent(current.id)
    }
    return ancestors
  }

  /**
   * Get incoming and outgoing edges for a node
   */
  getConnectedEdges(nodeId) {
    return {
      from: this.data.edges.filter(e => e.from === nodeId),
      to: this.data.edges.filter(e => e.to === nodeId)
    }
  }

  /**
   * Helper: Find a node by ID (recursive search across all levels)
   */
  findNodeById(id, nodes = this.data.nodes) {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children && node.children.length > 0) {
        const found = this.findNodeById(id, node.children)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Get all descendants of a node (entire subtree)
   */
  getDescendants(nodeId) {
    const node = this.findNodeById(nodeId)
    if (!node) return []
    const descendants = []
    const traverse = (n) => {
      if (n.children) {
        n.children.forEach(child => {
          descendants.push(child)
          traverse(child)
        })
      }
    }
    traverse(node)
    return descendants
  }

  /**
   * Get top-level core nodes (planets)
   */
  getCoreNodes() {
    return this.data.nodes
  }

  /**
   * Register callback for state changes
   */
  onStateChange(callback) {
    this.stateChangedCallbacks.push(callback)
  }

  /**
   * Emit state change to all listeners
   */
  emitStateChange(eventType, payload) {
    this.stateChangedCallbacks.forEach(cb => cb(eventType, payload))
  }
}

// Export singleton instance
export const graphManager = new GraphManager()
