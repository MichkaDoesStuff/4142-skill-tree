import express from 'express';
import cors from 'cors';
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

app.get('/api/graph', async (req, res) => {
  const session = driver.session();
  try {
    const nodeResult = await session.run('MATCH (n:Skill) RETURN n');
    const edgeResult = await session.run('MATCH (from:Skill)-[r]->(to:Skill) RETURN from.id as fromId, to.id as toId, type(r) as edgeType');

    const rawNodes = nodeResult.records.map(record => record.get('n').properties);
    const rawEdges = edgeResult.records.map(record => ({
      from: record.get('fromId'),
      to: record.get('toId'),
      type: record.get('edgeType')
    }));

    const childrenMap = new Map();
    const parentMap = new Map();

    rawEdges.forEach(edge => {
      if (edge.type === 'HAS_CHILD') {
        if (!childrenMap.has(edge.from)) childrenMap.set(edge.from, []);
        childrenMap.get(edge.from).push(edge.to);
        parentMap.set(edge.to, edge.from);
      }
    });

    const buildTree = (nodeId) => {
      const node = rawNodes.find(n => n.id === nodeId);
      if (!node) return null;

      let metadata = {};
      try { metadata = JSON.parse(node.metadata); } catch (e) { }

      const formattedNode = {
        id: node.id,
        label: node.label,
        category: node.category,
        metadata: metadata,
        children: []
      };

      const childrenIds = childrenMap.get(nodeId) || [];
      formattedNode.children = childrenIds.map(childId => buildTree(childId)).filter(Boolean);
      return formattedNode;
    };

    const rootNodesIds = rawNodes.map(n => n.id).filter(id => !parentMap.has(id));
    const finalNodes = rootNodesIds.map(id => buildTree(id)).filter(Boolean);

    const finalEdges = rawEdges
      .filter(edge => edge.type !== 'HAS_CHILD')
      .map(edge => ({ from: edge.from, to: edge.to, type: edge.type.toLowerCase() }));

    res.json({ nodes: finalNodes, edges: finalEdges });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Failed to fetch graph data" });
  } finally {
    await session.close();
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
