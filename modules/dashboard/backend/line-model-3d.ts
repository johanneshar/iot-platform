import type { LocalizedText } from '@iot/interface-schema';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import schema from '../schemas/line-model.schema.json' with { type: 'json' };
import type { LineModelInfo } from '../shared/model';

type Vec3 = [number, number, number];
type Mat4 = number[];

interface ModelConfig {
  lineId: string;
  model: string;
  machines: { machineId: string; nodes?: string[]; xRange?: [number, number] }[];
  alarms?: {
    alarmId: string;
    machineId: string;
    label: LocalizedText;
    position?: Vec3;
    node?: string;
  }[];
}

interface GltfNode {
  name?: string;
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: Vec3;
  rotation?: [number, number, number, number];
  scale?: Vec3;
}
interface Gltf {
  scene?: number;
  scenes?: { nodes?: number[] }[];
  nodes?: GltfNode[];
  meshes?: { primitives: { attributes: Record<string, number> }[] }[];
  accessors?: { min?: number[]; max?: number[] }[];
}

const validate = new Ajv2020({ allErrors: true }).compile(schema);

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Spaltenweise 4×4-Matrizen wie in glTF. */
function multiply(a: Mat4, b: Mat4): Mat4 {
  const r = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++)
        r[c * 4 + row] = (r[c * 4 + row] ?? 0) + (a[k * 4 + row] ?? 0) * (b[c * 4 + k] ?? 0);
  return r;
}

function local(node: GltfNode): Mat4 {
  if (node.matrix) return node.matrix;
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

const apply = (m: Mat4, [x, y, z]: Vec3): Vec3 => [
  (m[0] ?? 0) * x + (m[4] ?? 0) * y + (m[8] ?? 0) * z + (m[12] ?? 0),
  (m[1] ?? 0) * x + (m[5] ?? 0) * y + (m[9] ?? 0) * z + (m[13] ?? 0),
  (m[2] ?? 0) * x + (m[6] ?? 0) * y + (m[10] ?? 0) * z + (m[14] ?? 0),
];

/** Liest den JSON-Teil einer GLB-Datei. */
export function readGlbJson(buffer: Buffer): Gltf {
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('keine GLB-Datei');
  const length = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB ohne JSON-Teil');
  return JSON.parse(buffer.toString('utf8', 20, 20 + length)) as Gltf;
}

/** Begrenzungsquader je benanntem Knoten mit Mesh, in Weltkoordinaten. */
export function nodeBoxes(gltf: Gltf): Map<string, { min: Vec3; max: Vec3 }> {
  const boxes = new Map<string, { min: Vec3; max: Vec3 }>();
  const nodes = gltf.nodes ?? [];
  const visit = (index: number, parent: Mat4) => {
    const node = nodes[index];
    if (!node) return;
    const world = multiply(parent, local(node));
    const mesh = node.mesh === undefined ? undefined : gltf.meshes?.[node.mesh];
    if (mesh && node.name) {
      const min: Vec3 = [Infinity, Infinity, Infinity];
      const max: Vec3 = [-Infinity, -Infinity, -Infinity];
      for (const primitive of mesh.primitives) {
        const accessor = gltf.accessors?.[primitive.attributes['POSITION'] ?? -1];
        const lo = accessor?.min;
        const hi = accessor?.max;
        if (!lo || !hi) continue;
        for (const cx of [lo[0] ?? 0, hi[0] ?? 0])
          for (const cy of [lo[1] ?? 0, hi[1] ?? 0])
            for (const cz of [lo[2] ?? 0, hi[2] ?? 0]) {
              const p = apply(world, [cx, cy, cz]);
              for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i] ?? Infinity, p[i] ?? 0);
                max[i] = Math.max(max[i] ?? -Infinity, p[i] ?? 0);
              }
            }
      }
      if (Number.isFinite(min[0])) boxes.set(node.name, { min, max });
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? [];
  for (const root of roots) visit(root, IDENTITY);
  return boxes;
}

const matches = (pattern: string, name: string) =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`,
  ).test(name);

/** Toleranz beim Abschnitt entlang der Linie (m) */
const X_TOLERANCE = 0.05;

/** Löst die Zuordnung auf: Knoten je Maschine, Position je Alarmstelle. */
export function resolveModel(config: ModelConfig, gltf: Gltf): LineModelInfo {
  const boxes = nodeBoxes(gltf);
  const names = [...boxes.keys()];
  const byNameOf = (m: ModelConfig['machines'][number]) =>
    (m.nodes ?? []).flatMap((p) => names.filter((n) => matches(p, n)));
  // Per Name zugeordnete Teile gehören genau dieser Maschine – auch wenn sie im Abschnitt einer anderen liegen
  const named = new Set(config.machines.flatMap(byNameOf));
  const machines = config.machines.map((m) => {
    const byName = byNameOf(m);
    const byRange = m.xRange
      ? names.filter((n) => {
          const box = boxes.get(n);
          const [from, to] = m.xRange ?? [0, 0];
          return (
            !named.has(n) &&
            box !== undefined &&
            box.min[0] >= from - X_TOLERANCE &&
            box.max[0] <= to + X_TOLERANCE
          );
        })
      : [];
    return { machineId: m.machineId, nodes: [...new Set([...byName, ...byRange])] };
  });
  const alarms = (config.alarms ?? []).flatMap((a) => {
    let position = a.position;
    if (!position && a.node) {
      const box = boxes.get(a.node);
      if (box) position = [0, 1, 2].map((i) => ((box.min[i] ?? 0) + (box.max[i] ?? 0)) / 2) as Vec3;
    }
    return position
      ? [{ alarmId: a.alarmId, machineId: a.machineId, label: a.label, position }]
      : [];
  });
  return { file: 'model/file', machines, alarms };
}

export interface LoadedModel {
  info: LineModelInfo;
  path: string;
}

/**
 * Sucht im Ordner die Zuordnung (`*.model.json`) für diese Linie und prüft sie (Schema, Modell
 * vorhanden). Ohne Zuordnung `null` – dann zeigt die Oberfläche nur den Linienfluss (A-01.4).
 */
export function loadLineModel(
  dir: string,
  lineId: string,
  log: (m: string) => void,
): LoadedModel | null {
  if (!existsSync(dir)) return null;
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.model.json'))
    .sort()) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      log(`3D-Zuordnung ${file}: kein gültiges JSON (${String(error)})`);
      continue;
    }
    if (!validate(data)) {
      log(
        `3D-Zuordnung ${file} abgelehnt: ${(validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`).join('; ')}`,
      );
      continue;
    }
    const config = data as unknown as ModelConfig;
    if (config.lineId !== lineId) continue;
    const path = join(dir, config.model);
    if (!existsSync(path)) {
      log(`3D-Zuordnung ${file}: Modell ${config.model} fehlt`);
      continue;
    }
    const info = resolveModel(config, readGlbJson(readFileSync(path)));
    for (const m of info.machines.filter((x) => x.nodes.length === 0))
      log(`3D-Zuordnung ${file}: keine Modellteile für ${m.machineId}`);
    return { info, path };
  }
  return null;
}
