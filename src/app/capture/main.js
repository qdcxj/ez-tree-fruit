import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Tree } from '../../lib/tree.js';
import { loadPresetWithTextures } from '../textures.js';

const container = document.getElementById('app');
const label = document.getElementById('label');
const params = new URLSearchParams(window.location.search);
const fruitType = params.get('fruit') === 'glassBall' ? 'glassBall' : 'apple';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 2;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x94b9f8);
scene.fog = new THREE.FogExp2(0x94b9f8, 0.0015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(12, 8, 14);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 10, 0);
controls.update();

const hemi = new THREE.HemisphereLight(0xddeeff, 0x334422, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d6, 2.4);
sun.position.set(20, 30, 10);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(80, 64),
  new THREE.MeshStandardMaterial({ color: 0x5f8f3a, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const tree = new Tree();
await loadPresetWithTextures(tree, 'Ash Medium');
tree.options.fruits.enabled = true;
tree.options.fruits.type = fruitType;
tree.options.fruits.count = 12;
tree.options.fruits.size = 0.58;
tree.options.fruits.segments = 16;
tree.generate();
tree.castShadow = true;
tree.receiveShadow = true;
scene.add(tree);

label.style.display = 'none';

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);

function render() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
window.__CAPTURE_READY__ = true;
