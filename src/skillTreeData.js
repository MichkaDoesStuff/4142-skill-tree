import * as THREE from 'three';

export const skillNodes = [
  { id: 'topic-1', title: 'Intro to Programming', category: 'Fundamentals', status: 'mastered', lat:  10, lon:  20, dependsOn: [] },
  { id: 'topic-2', title: 'JavaScript Basics', category: 'Fundamentals', status: 'mastered', lat:  40, lon:  60, dependsOn: ['topic-1'] },
  { id: 'topic-3', title: 'DOM & Events', category: 'Frontend', status: 'inprogress', lat: -10, lon:  80, dependsOn: ['topic-2'] },
  { id: 'topic-4', title: 'Data Structures', category: 'Algorithms', status: 'locked', lat: -45, lon: 130, dependsOn: ['topic-2'] },
  { id: 'topic-5', title: 'Async Programming', category: 'Advanced', status: 'locked', lat:  60, lon: -80, dependsOn: ['topic-2'] },
  { id: 'topic-6', title: '3D Graphics', category: 'Advanced', status: 'locked', lat:  20, lon: -140, dependsOn: ['topic-3'] },
  { id: 'topic-7', title: 'Networking Basics', category: 'Systems', status: 'locked', lat: -60, lon: -30, dependsOn: ['topic-1'] },
  { id: 'topic-8', title: 'Project Integration', category: 'Capstone', status: 'locked', lat:  0, lon: -170, dependsOn: ['topic-3', 'topic-4', 'topic-5'] }
];

export function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}
