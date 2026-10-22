import {
  useAlarms,
  useDeepLinkTargets,
  useMachines,
  useModuleApi,
  useNavigate,
  useTranslation,
  type LocalizedText,
} from '@iot/module-sdk';
import { ModelViewer, type ModelMarker } from '@iot/ui';
import type { LineModelInfo } from '../../shared/model';
import { MODULE_ID } from '../module-id';

const TROUBLESHOOTING_MODULE = 'troubleshooting';
const ALARM_TARGET = 'alarm';

const text = (value: LocalizedText | null | undefined, language: string, fallback: string) =>
  (value as Record<string, string | undefined> | null | undefined)?.[language] ??
  value?.de ??
  fallback;

export interface LineModelViewProps {
  model: LineModelInfo;
  /** Detailseite: nur diese Maschine; Linienansicht: `null` */
  machineId: string | null;
  onMachineSelect?: (machineId: string) => void;
}

/**
 * 3D-Ansicht mit Alarmmarkierungen (A-01): markiert sind nur anstehende Alarme mit Fehlerbaum, und nur
 * wenn die geführte Fehlersuche gebucht ist (A-01.7, A-01.9). Berühren startet die Fehlersuche.
 */
export function LineModelView({ model, machineId, onMachineSelect }: LineModelViewProps) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const api = useModuleApi();
  const navigate = useNavigate();
  const hasTarget = useDeepLinkTargets();
  const machines = useMachines();
  const alarms = useAlarms();

  const markers: ModelMarker[] = model.alarms.flatMap((spot) => {
    if (machineId && spot.machineId !== machineId) return [];
    const alarm = alarms.find((a) => a.alarmId === spot.alarmId && a.machineId === spot.machineId);
    if (!alarm || !hasTarget(TROUBLESHOOTING_MODULE, ALARM_TARGET, alarm.alarmId)) return [];
    const label = text(spot.label, lang, spot.alarmId);
    const tone = alarm.class === 'fault' ? 'fault' : 'warning';
    return [
      {
        id: `${spot.machineId}-${spot.alarmId}`,
        position: spot.position,
        label,
        tone,
        ariaLabel: t('model3d.marker', {
          severity: t(`model3d.${tone}`),
          text: text(alarm.text, lang, label),
        }),
        onActivate: () => {
          navigate(TROUBLESHOOTING_MODULE, { alarmId: alarm.alarmId, machine: alarm.machineId });
        },
      },
    ];
  });

  const name = (id: string) => machines.find((m) => m.machineId === id)?.identity?.type ?? id;
  return (
    <ModelViewer
      src={api.url(model.file)}
      label={
        machineId ? t('model3d.machineLabel', { name: name(machineId) }) : t('model3d.lineLabel')
      }
      groups={model.machines.map((m) => ({
        id: m.machineId,
        label: name(m.machineId),
        nodes: m.nodes,
      }))}
      focus={machineId}
      showGroupLabels={machineId === null}
      markers={markers}
      size={machineId ? 'lg' : 'md'}
      {...(onMachineSelect ? { onGroupSelect: onMachineSelect } : {})}
    />
  );
}
