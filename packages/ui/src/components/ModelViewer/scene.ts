import type { Box3, Material, Mesh, Object3D, PerspectiveCamera, WebGLRenderer } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Vec3 = readonly [number, number, number];

export interface SceneHandle {
  /** Bildschirmposition (px, relativ zur Fläche) eines Punkts im Modell */
  project: (position: Vec3) => { x: number; y: number; visible: boolean };
  /** Ankerpunkt je Maschine: Mitte oben auf ihren Teilen */
  groupAnchors: () => [string, Vec3][];
  /** Maschine unter dem Zeiger */
  pick: (clientX: number, clientY: number) => string | null;
  setFocus: (groupId: string | null) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  onRender: (listener: (() => void) | null) => void;
  dispose: () => void;
}

/** Blickrichtung von vorn, leicht von oben – die Vorderseite der Linie zeigt nach +z */
const VIEW_DIRECTION: Vec3 = [0.12, 0.32, 1];
/** Rand um das Modell im Bild */
const MARGIN = 1.12;
/** Deckkraft der Teile außerhalb der gewählten Maschine */
const DIMMED_OPACITY = 0.14;

/**
 * Baut die Szene: three.js und das Modell werden hier erst geladen (eigener Chunk). Rendert nur bei
 * Bedarf (Drehen, Zoomen, Größenänderung).
 */
export async function createScene(
  host: HTMLElement,
  src: string,
  groups: readonly [string, readonly string[]][],
): Promise<SceneHandle> {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { OrbitControls: Controls } = await import('three/examples/jsm/controls/OrbitControls.js');

  const renderer: WebGLRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0b8b8, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(5, 10, 8);
  scene.add(sun);
  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(35, 1, 0.05, 500);

  const gltf = await new GLTFLoader().loadAsync(src);
  scene.add(gltf.scene);

  const groupOf = new Map<string, string>();
  for (const [id, nodes] of groups) for (const node of nodes) groupOf.set(node, id);
  const meshes: Mesh[] = [];
  gltf.scene.traverse((object) => {
    if ('isMesh' in object) meshes.push(object as Mesh);
  });
  // Der Knotenname kann am Mesh oder an einem übergeordneten Objekt stehen
  const nodeGroup = (object: Object3D): string | null => {
    let current: Object3D | null = object;
    while (current !== null) {
      const id = groupOf.get(current.name);
      if (id) return id;
      current = current.parent;
    }
    return null;
  };
  const original = new Map<Mesh, Material | Material[]>(meshes.map((m) => [m, m.material]));

  const boxOf = (filter: (mesh: Mesh) => boolean): Box3 => {
    const box = new THREE.Box3();
    for (const mesh of meshes) if (filter(mesh)) box.expandByObject(mesh);
    return box;
  };
  const all = boxOf(() => true);
  const groupBoxes = new Map(
    groups.map(([id]) => [id, boxOf((mesh) => nodeGroup(mesh) === id)] as const),
  );

  const controls: OrbitControls = new Controls(camera, renderer.domElement);
  controls.enableDamping = false;
  let home = { position: new THREE.Vector3(), target: new THREE.Vector3() };

  const frameBox = (box: Box3) => {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Abstand so, dass Breite und Höhe ins Bild passen (Seitenverhältnis der Fläche)
    const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const distance =
      Math.max(size.x / 2 / Math.tan(horizontal), size.y / 2 / Math.tan(vertical), 0.5) * MARGIN +
      size.z / 2;
    const direction = new THREE.Vector3(...VIEW_DIRECTION).normalize();
    home = { position: center.clone().addScaledVector(direction, distance), target: center };
    camera.position.copy(home.position);
    controls.target.copy(home.target);
    controls.update();
  };
  let framed: Box3 | null = null;
  const frame = (box: Box3) => {
    framed = box;
    frameBox(box);
  };

  let listener: (() => void) | null = null;
  const render = () => {
    renderer.render(scene, camera);
    listener?.();
  };
  controls.addEventListener('change', render);

  const resize = () => {
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (framed) frameBox(framed);
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  host.appendChild(renderer.domElement);
  framed = all;
  resize();

  const raycaster = new THREE.Raycaster();
  return {
    project: ([x, y, z]) => {
      const p = new THREE.Vector3(x, y, z).project(camera);
      return {
        x: ((p.x + 1) / 2) * host.clientWidth,
        y: ((1 - p.y) / 2) * host.clientHeight,
        visible: p.z > -1 && p.z < 1 && Math.abs(p.x) <= 1.05 && Math.abs(p.y) <= 1.05,
      };
    },
    groupAnchors: () =>
      [...groupBoxes.entries()]
        .filter(([, box]) => !box.isEmpty())
        .map(([id, box]) => {
          const c = box.getCenter(new THREE.Vector3());
          return [id, [c.x, box.max.y, box.max.z] as Vec3];
        }),
    pick: (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(meshes, false)) {
        const id = nodeGroup(hit.object);
        if (id) return id;
      }
      return null;
    },
    setFocus: (groupId) => {
      for (const mesh of meshes) {
        const base = original.get(mesh) ?? mesh.material;
        if (!groupId || nodeGroup(mesh) === groupId) {
          mesh.material = base;
          continue;
        }
        const dim = (m: Material) => {
          const copy = m.clone();
          copy.transparent = true;
          copy.opacity = DIMMED_OPACITY;
          copy.depthWrite = false;
          return copy;
        };
        mesh.material = Array.isArray(base) ? base.map(dim) : dim(base);
      }
      const box = groupId ? groupBoxes.get(groupId) : undefined;
      frame(box && !box.isEmpty() ? box : all);
      render();
    },
    zoom: (factor) => {
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      render();
    },
    reset: () => {
      camera.position.copy(home.position);
      controls.target.copy(home.target);
      controls.update();
      render();
    },
    onRender: (next) => {
      listener = next;
    },
    dispose: () => {
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
