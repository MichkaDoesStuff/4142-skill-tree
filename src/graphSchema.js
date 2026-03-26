/**
 * GRAPH SCHEMA & SAMPLE DATA
 * 
 * Flexible, generic graph structure supporting:
 * - Directed graphs with cycles
 * - Multi-level hierarchy (stars can have children, recursively)
 * - State-driven nodes (locked/unlocked/mastered)
 * - Cross-connections between unrelated branches
 * 
 * You can replace this with your own data by matching the structure below.
 */

/**
 * Node structure:
 * {
 *   id: string (unique identifier)
 *   label: string (display name)
 *   category: string (e.g., "core", "sub", "technique")
 *   metadata: {} (optional, custom fields like color, description)
 *   children: Node[] (sub-nodes, e.g., stars orbiting a planet)
 * }
 * 
 * Edge structure (for cross-connections):
 * {
 *   from: string (node id)
 *   to: string (node id)
 *   type: "related" | "extends" (optional, for visualization styling)
 * }
 */

export const graphData = {
  nodes: [
    // PLANET 1: Data Collection
    {
      id: 'planet_1',
      label: 'Data Collection',
      category: 'core',
      metadata: { color: 0xff6b6b, description: 'Gathering and sourcing raw data' },
      children: [
        {
          id: 'star_1_1',
          label: 'Web Scraping',
          category: 'technique',
          metadata: { color: 0xff8787 },
          children: [
            { id: 'star_1_1_1', label: 'BeautifulSoup', category: 'tool', metadata: { color: 0xffb3b3 }, children: [] },
            { id: 'star_1_1_2', label: 'Selenium', category: 'tool', metadata: { color: 0xffb3b3 }, children: [] },
          ]
        },
        {
          id: 'star_1_2',
          label: 'APIs',
          category: 'technique',
          metadata: { color: 0xff8787 },
          children: [
            { id: 'star_1_2_1', label: 'REST APIs', category: 'tool', metadata: { color: 0xffb3b3 }, children: [] },
            { id: 'star_1_2_2', label: 'Authentication', category: 'tool', metadata: { color: 0xffb3b3 }, children: [] },
          ]
        },
        {
          id: 'star_1_3',
          label: 'Databases',
          category: 'technique',
          metadata: { color: 0xff8787 },
          children: [
            { id: 'star_1_3_1', label: 'SQL', category: 'tool', metadata: { color: 0xffb3b3 }, children: [] },
            { id: 'star_1_3_2', label: 'NoSQL', category: 'tool', metadata: { color: 0xffb3b3 }, children: [] },
          ]
        },
      ]
    },
    // PLANET 2: Data Cleaning & Preprocessing
    {
      id: 'planet_2',
      label: 'Data Cleaning',
      category: 'core',
      metadata: { color: 0x4ecdc4, description: 'Preparing data for analysis' },
      children: [
        {
          id: 'star_2_1',
          label: 'Missing Data',
          category: 'technique',
          metadata: { color: 0x6ee7de },
          children: [
            { id: 'star_2_1_1', label: 'Imputation', category: 'method', metadata: { color: 0x95f0e8 }, children: [] },
            { id: 'star_2_1_2', label: 'Deletion', category: 'method', metadata: { color: 0x95f0e8 }, children: [] },
          ]
        },
        {
          id: 'star_2_2',
          label: 'Outliers',
          category: 'technique',
          metadata: { color: 0x6ee7de },
          children: [
            { id: 'star_2_2_1', label: 'Detection', category: 'method', metadata: { color: 0x95f0e8 }, children: [] },
            { id: 'star_2_2_2', label: 'Treatment', category: 'method', metadata: { color: 0x95f0e8 }, children: [] },
          ]
        },
        {
          id: 'star_2_3',
          label: 'Normalization',
          category: 'technique',
          metadata: { color: 0x6ee7de },
          children: [
            { id: 'star_2_3_1', label: 'Scaling', category: 'method', metadata: { color: 0x95f0e8 }, children: [] },
            { id: 'star_2_3_2', label: 'Encoding', category: 'method', metadata: { color: 0x95f0e8 }, children: [] },
          ]
        },
      ]
    },
    // PLANET 3: Exploratory Data Analysis
    {
      id: 'planet_3',
      label: 'EDA',
      category: 'core',
      metadata: { color: 0xf9ca24, description: 'Understanding data patterns' },
      children: [
        {
          id: 'star_3_1',
          label: 'Descriptive Stats',
          category: 'technique',
          metadata: { color: 0xf9d956 },
          children: [
            { id: 'star_3_1_1', label: 'Mean, Median, Mode', category: 'metric', metadata: { color: 0xfddc7d }, children: [] },
            { id: 'star_3_1_2', label: 'Std Dev, Variance', category: 'metric', metadata: { color: 0xfddc7d }, children: [] },
          ]
        },
        {
          id: 'star_3_2',
          label: 'Visualization',
          category: 'technique',
          metadata: { color: 0xf9d956 },
          children: [
            { id: 'star_3_2_1', label: 'Matplotlib', category: 'tool', metadata: { color: 0xfddc7d }, children: [] },
            { id: 'star_3_2_2', label: 'Seaborn', category: 'tool', metadata: { color: 0xfddc7d }, children: [] },
          ]
        },
        {
          id: 'star_3_3',
          label: 'Correlations',
          category: 'technique',
          metadata: { color: 0xf9d956 },
          children: [
            { id: 'star_3_3_1', label: 'Pearson', category: 'method', metadata: { color: 0xfddc7d }, children: [] },
            { id: 'star_3_3_2', label: 'Spearman', category: 'method', metadata: { color: 0xfddc7d }, children: [] },
          ]
        },
      ]
    },
    // PLANET 4: Modeling
    {
      id: 'planet_4',
      label: 'Modeling',
      category: 'core',
      metadata: { color: 0x6c5ce7, description: 'Building predictive models' },
      children: [
        {
          id: 'star_4_1',
          label: 'Regression',
          category: 'technique',
          metadata: { color: 0x8e76d4 },
          children: [
            { id: 'star_4_1_1', label: 'Linear Regression', category: 'algorithm', metadata: { color: 0xab9ee0 }, children: [] },
            { id: 'star_4_1_2', label: 'Polynomial', category: 'algorithm', metadata: { color: 0xab9ee0 }, children: [] },
          ]
        },
        {
          id: 'star_4_2',
          label: 'Classification',
          category: 'technique',
          metadata: { color: 0x8e76d4 },
          children: [
            { id: 'star_4_2_1', label: 'Logistic Regression', category: 'algorithm', metadata: { color: 0xab9ee0 }, children: [] },
            { id: 'star_4_2_2', label: 'Decision Trees', category: 'algorithm', metadata: { color: 0xab9ee0 }, children: [] },
          ]
        },
        {
          id: 'star_4_3',
          label: 'Clustering',
          category: 'technique',
          metadata: { color: 0x8e76d4 },
          children: [
            { id: 'star_4_3_1', label: 'K-Means', category: 'algorithm', metadata: { color: 0xab9ee0 }, children: [] },
            { id: 'star_4_3_2', label: 'Hierarchical', category: 'algorithm', metadata: { color: 0xab9ee0 }, children: [] },
          ]
        },
      ]
    },
  ],
  edges: [
    // Cross-connections (related/extends only, no prerequisites)
    { from: 'planet_1', to: 'planet_2', type: 'related' },
    { from: 'planet_2', to: 'planet_3', type: 'related' },
    { from: 'planet_3', to: 'planet_4', type: 'related' },
    { from: 'star_1_1', to: 'star_2_1', type: 'extends' },
    { from: 'star_3_2', to: 'star_4_2', type: 'extends' },
  ]
}

/**
 * Helper: Find a node by ID (recursive search across all levels)
 */
export function findNodeById(id, nodes = graphData.nodes) {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children && node.children.length > 0) {
      const found = findNodeById(id, node.children)
      if (found) return found
    }
  }
  return null
}

/**
 * Helper: Get all nodes in flat list (including nested)
 */
export function getAllNodes(nodes = graphData.nodes) {
  let flat = []
  for (const node of nodes) {
    flat.push(node)
    if (node.children && node.children.length > 0) {
      flat = flat.concat(getAllNodes(node.children))
    }
  }
  return flat
}
