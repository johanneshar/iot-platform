import type { Meta, StoryObj } from '@storybook/react-vite';
import { ModelViewer } from './ModelViewer';

// Blockmodell der Flexfill (packages/simulator/fixtures/models, in Storybook unter /models)
const SRC = '/models/flexfill_blockmodell.glb';
const names = (prefix: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}_${String(from + i).padStart(2, '0')}`);

const groups = [
  {
    id: 'l3-debag',
    label: 'Beutelauspacker',
    nodes: ['Vormodul_Unterbau_01', 'Vormodul_Kammer_01', 'Vormodul_Haube_01'],
  },
  {
    id: 'l3-delid',
    label: 'Öffner (Delid/Delining)',
    nodes: ['Isolator_Rueckwand_01', ...names('Isolator_Rahmen', 1, 4), 'Prozessmodul_01'],
  },
  {
    id: 'l3-fill',
    label: 'Füll- und Verschließmaschine',
    nodes: ['Isolator_Rueckwand_02', ...names('Isolator_Rahmen', 5, 8), 'Prozessmodul_02'],
  },
  {
    id: 'l3-transfer',
    label: 'Transfermodul',
    nodes: ['Isolator_Rueckwand_03', ...names('Isolator_Rahmen', 9, 12), 'Prozessmodul_03'],
  },
  {
    id: 'l3-cap',
    label: 'Bördelmodul',
    nodes: ['Isolator_Rueckwand_04', ...names('Isolator_Rahmen', 13, 16), 'Prozessmodul_04'],
  },
];

const meta = {
  title: 'Auswertung/ModelViewer',
  component: ModelViewer,
  args: {
    src: SRC,
    label: '3D-Ansicht Linie 3 · Flexfill',
    groups,
    showGroupLabels: true,
    onGroupSelect: () => undefined,
    markers: [
      {
        id: 'FILL-WGT-0003',
        position: [5.6, 1.25, 0.2],
        label: 'Wägezelle 3',
        tone: 'fault',
        ariaLabel: 'Störung Wägezelle 3: Tara-Abweichung – Fehlersuche starten',
        onActivate: () => undefined,
      },
    ],
  },
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Linie: Story = {};

export const Maschine: Story = {
  args: { focus: 'l3-fill', showGroupLabels: false },
};

export const OhneModell: Story = {
  args: { src: '/models/gibt-es-nicht.glb', markers: [] },
};
