import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import { Icon } from '../../icons/Icon';
import { createScene, type SceneHandle } from './scene';
import styles from './ModelViewer.module.css';

export type Vec3 = readonly [number, number, number];

/** Teile des Modells, die zusammen eine Maschine bilden. */
export interface ModelGroup {
  id: string;
  label: string;
  /** Namen der Knoten im glTF-Modell */
  nodes: readonly string[];
}

/** Markierung einer Alarmstelle (A-01.7). */
export interface ModelMarker {
  id: string;
  position: Vec3;
  /** kurzer Text am Punkt, z. B. „Wägezelle 3“ */
  label: string;
  tone: 'fault' | 'warning';
  /** vollständige Beschreibung, z. B. „Störung Wägezelle 3: Tara-Abweichung – Fehlersuche starten“ */
  ariaLabel: string;
  onActivate: () => void;
}

export interface ModelViewerProps {
  /** Adresse der glTF/GLB-Datei */
  src: string;
  /** Beschreibung der Ansicht für Screenreader */
  label: string;
  groups?: readonly ModelGroup[];
  /** Maschine, auf die die Ansicht zielt; die übrigen Teile treten zurück */
  focus?: string | null;
  /** Namen der Maschinen als Schaltflächen im Bild (Linienansicht) */
  showGroupLabels?: boolean;
  onGroupSelect?: (id: string) => void;
  markers?: readonly ModelMarker[];
  size?: 'md' | 'lg';
}

interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * 3D-Ansicht einer Linie oder Maschine (M5a, A-01). three.js wird erst beim ersten Anzeigen geladen.
 * Markierungen und Maschinennamen sind Schaltflächen über dem Bild – bedienbar per Tastatur.
 */
export function ModelViewer({
  src,
  label,
  groups = [],
  focus = null,
  showGroupLabels = false,
  onGroupSelect,
  markers = [],
  size = 'md',
}: ModelViewerProps) {
  const t = useUiTranslation();
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneHandle | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [points, setPoints] = useState<Record<string, ScreenPoint>>({});
  const down = useRef<{ x: number; y: number } | null>(null);

  // Gruppen und Markierungen als Schlüssel, damit der Effekt nur bei echten Änderungen neu startet
  const groupsKey = JSON.stringify(groups.map((g) => [g.id, g.nodes]));
  const anchorsKey = JSON.stringify(markers.map((m) => [m.id, m.position]));

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    setState('loading');
    createScene(element, src, JSON.parse(groupsKey) as [string, string[]][]).then(
      (handle) => {
        if (disposed) {
          handle.dispose();
          return;
        }
        scene.current = handle;
        setState('ready');
      },
      () => {
        if (!disposed) setState('error');
      },
    );
    return () => {
      disposed = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [src, groupsKey]);

  // Bildschirmpositionen der Markierungen und Maschinennamen nach jedem Bild aktualisieren
  useEffect(() => {
    const handle = scene.current;
    if (state !== 'ready' || !handle) return;
    const anchors = JSON.parse(anchorsKey) as [string, Vec3][];
    const update = () => {
      const next: Record<string, ScreenPoint> = {};
      for (const [id, position] of anchors) next[`m:${id}`] = handle.project(position);
      for (const [id, position] of handle.groupAnchors())
        next[`g:${id}`] = handle.project(position);
      setPoints(next);
    };
    handle.onRender(update);
    handle.setFocus(focus);
    update();
    return () => {
      handle.onRender(null);
    };
  }, [state, anchorsKey, focus]);

  const click = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const start = down.current;
      down.current = null;
      if (!start || !onGroupSelect || !scene.current) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return; // gedreht, nicht geklickt
      const id = scene.current.pick(event.clientX, event.clientY);
      if (id) onGroupSelect(id);
    },
    [onGroupSelect],
  );

  const at = (key: string) => {
    const p = points[key];
    return p?.visible ? { left: `${String(p.x)}px`, top: `${String(p.y)}px` } : null;
  };

  return (
    <div
      ref={frame}
      className={cx(styles.frame, styles[size])}
      role="region"
      aria-label={label}
      data-model-state={state}
    >
      <div
        ref={host}
        className={styles.canvas}
        aria-hidden="true"
        onPointerDown={(event) => {
          down.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={click}
      />
      {state !== 'ready' && (
        <div className={styles.status} role={state === 'error' ? 'alert' : 'status'}>
          {state === 'error' ? t('model.error') : t('model.loading')}
        </div>
      )}
      {state === 'ready' && (
        <>
          {showGroupLabels &&
            groups.map((g, index) => {
              const style = at(`g:${g.id}`);
              return style ? (
                <button
                  key={g.id}
                  type="button"
                  // jeder zweite Name eine Zeile höher, damit benachbarte Namen sich nicht überdecken
                  className={cx(styles.groupLabel, index % 2 === 1 && styles.raised)}
                  style={style}
                  onClick={() => onGroupSelect?.(g.id)}
                >
                  {g.label}
                </button>
              ) : null;
            })}
          {markers.map((m) => {
            const style = at(`m:${m.id}`);
            return style ? (
              <button
                key={m.id}
                type="button"
                className={cx(styles.marker, styles[m.tone])}
                style={style}
                aria-label={m.ariaLabel}
                onClick={m.onActivate}
              >
                <span className={styles.badge} aria-hidden="true">
                  !
                </span>
                {m.label}
              </button>
            ) : null;
          })}
          <div className={styles.tools} role="group" aria-label={t('model.label')}>
            <button
              type="button"
              className={styles.tool}
              aria-label={t('model.zoomIn')}
              onClick={() => scene.current?.zoom(0.8)}
            >
              <Icon name="zoomIn" />
            </button>
            <button
              type="button"
              className={styles.tool}
              aria-label={t('model.zoomOut')}
              onClick={() => scene.current?.zoom(1.25)}
            >
              <Icon name="zoomOut" />
            </button>
            <button
              type="button"
              className={styles.tool}
              aria-label={t('model.reset')}
              onClick={() => scene.current?.reset()}
            >
              <Icon name="reset" />
            </button>
            <button
              type="button"
              className={styles.tool}
              aria-label={t('model.fullscreen')}
              onClick={() => void frame.current?.requestFullscreen()}
            >
              <Icon name="fullscreen" />
            </button>
          </div>
          {markers.length > 0 && (
            <div className={styles.legend} aria-hidden="true">
              <span className={styles.legendItem}>
                <span className={cx(styles.dot, styles.fault)} />
                {t('model.legendFault')}
              </span>
              <span className={styles.legendItem}>
                <span className={cx(styles.dot, styles.warning)} />
                {t('model.legendWarning')}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
