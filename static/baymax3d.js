// BaySkills 3D Baymax. Loads three.js from a CDN (see the importmap in index.html).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL = '/models/BayMax.gltf';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HEAD_NODE = 'GeometryGroup_29', HEAD_PIVOT = [0.35, 0, 25.8]; // neck position in the model's own units
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let cache = null;
const load = () => cache || (cache = new GLTFLoader().loadAsync(MODEL));

// view = what the camera frames: cy = centre height, h/w = size to fit (model is 2.2 tall, ~1.7 wide). tilt = lean in radians.
async function mount(el, { shift = 0, tilt = 0, view = { cy: 0, h: 2.6, w: 1.9 }, onClick } = {}) {
  let gltf, renderer;
  try {
    gltf = await load();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { console.warn('BaySkills: 3D Baymax unavailable', e); return null; }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const cv = renderer.domElement;
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y';
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Baymax saying hello');
  el.appendChild(cv);

  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d929c, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-2.5, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(3, 1, -2); scene.add(rim);

  // The file is z-up and faces -y. Stand it upright facing the camera, then centre and scale it.
  const root = gltf.scene.clone(true), holder = new THREE.Group();
  const sk = root.getObjectByName('Sketchfab_model');
  if (sk) { sk.position.set(0, 0, 0); sk.scale.set(1, 1, 1); sk.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); }
  holder.add(root); scene.add(holder); holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const s = 2.2 / size.y; root.scale.setScalar(s); root.position.set(-c.x * s, -c.y * s, -c.z * s);
  holder.position.x = shift;
  root.traverse(o => { if (o.isMesh) { o.material.emissiveIntensity = 0.18; o.material.roughness = 0.55; } });

  // Head gets its own pivot at the neck so it can turn on its own.
  const head = root.getObjectByName(HEAD_NODE); let pivot = null;
  if (head && head.parent) {
    pivot = new THREE.Group(); pivot.position.set(...HEAD_PIVOT); head.parent.add(pivot); pivot.add(head);
    head.position.set(-HEAD_PIVOT[0], -HEAD_PIVOT[1], -HEAD_PIVOT[2]);
  }

  // Add lightweight pivots to the side appendages so Baymax can wave occasionally.
  const armPivots = [];
  for (const name of ['GeometryGroup_15', 'GeometryGroup_43']) {
    const arm = root.getObjectByName(name);
    if (!arm || !arm.parent) continue;
    arm.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(arm);
    const center = bounds.getCenter(new THREE.Vector3());
    const parent = arm.parent;
    const localCenter = parent.worldToLocal(center.clone());
    const pivotArm = new THREE.Group();
    parent.add(pivotArm);
    pivotArm.position.copy(localCenter);
    pivotArm.attach(arm);
    armPivots.push({ pivot: pivotArm, side: center.x < 0 ? -1 : 1 });
  }

  const clock = new THREE.Clock(); let tx = 0, ty = 0, px = 0, py = 0, lastMove = -99, nodAt = 0, visible = true, raf = 0, dead = false;
  let nextWaveAt = 7 + Math.random() * 5, waveStart = -100, waveSide = 1;
  const onMove = e => {
    const r = el.getBoundingClientRect();
    tx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth * 0.5), -1, 1);
    ty = clamp(-(e.clientY - (r.top + r.height * 0.3)) / (innerHeight * 0.5), -1, 1);
    lastMove = clock.elapsedTime;
  };
  addEventListener('pointermove', onMove, { passive: true });
  const click = () => { nodAt = clock.elapsedTime; if (onClick) onClick(); };
  el.addEventListener('click', click);

  function resize() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const th = Math.tan(cam.fov * Math.PI / 360);
    cam.position.set(0, view.cy, Math.max(view.h, view.w / cam.aspect) / (2 * th));
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(el);

  (function frame() {
    if (dead) return; raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    if (!visible || !el.clientWidth) return;
    if (!REDUCE && t - lastMove > 3.5) { tx = Math.sin(t * 0.5) * 0.6; ty = Math.sin(t * 0.37) * 0.15; }
    px += (tx - px) * 0.08; py += (ty - py) * 0.08;
    const k = t - nodAt, nod = REDUCE || k > 2.2 ? 0 : Math.sin(k / 2.2 * Math.PI * 2) * 0.3; // greeting nod on load and on click
    if (pivot) pivot.rotation.set(-py * 0.35 + nod, 0, px * 0.7);
    // Short, occasional hello wave; reduced-motion settings disable all procedural gestures.
    let wave = 0;
    if (!REDUCE) {
      if (t >= nextWaveAt) {
        waveStart = t;
        nextWaveAt = t + 13 + Math.random() * 11;
        waveSide = Math.random() < 0.5 ? -1 : 1;
      }
      const progress = (t - waveStart) / 2.6;
      if (progress >= 0 && progress <= 1) wave = Math.sin(progress * Math.PI);
    }
    armPivots.forEach(({pivot: ap, side}) => {
      const isWaveArm = side === waveSide;
      ap.rotation.z = isWaveArm ? wave * 0.55 : Math.sin(t * 0.65 + side) * 0.025;
      ap.rotation.x = isWaveArm ? wave * 0.12 : 0;
    });
    holder.rotation.set(nod * 0.25, px * 0.3, tilt); // lean + turn toward the cursor, no vertical movement
    renderer.render(scene, cam);
  })();

  return { destroy() { dead = true; cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); el.removeEventListener('click', click); ro.disconnect(); io.disconnect(); renderer.dispose(); cv.remove(); }, nod() { nodAt = clock.elapsedTime; } };
}
window.BM = { mount }; dispatchEvent(new Event('bm-ready'));
