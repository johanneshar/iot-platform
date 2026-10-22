import { MODULE_CATEGORIES, useTranslation, type ModuleCategory } from '@iot/module-sdk';
import { FilterGroup, ModuleCard, Stack } from '@iot/ui';
import { useState } from 'react';
import type { ShellModule } from '../api';
import { CORE_NAMESPACE } from '../i18n';
import { localized } from '../localized';
import styles from './Catalog.module.css';

type Filter = 'all' | ModuleCategory;

interface CatalogProps {
  modules: readonly ShellModule[];
  onToggle: (module: ShellModule) => void;
  onOpen: (moduleId: string) => void;
}

/** Baukasten: alle Module des Katalogs mit Buchungsstand (E-14: buchen nur durch den Admin, ab M3b). */
export function Catalog({ modules, onToggle, onOpen }: CatalogProps) {
  const { t, i18n } = useTranslation(CORE_NAMESPACE);
  const [filter, setFilter] = useState<Filter>('all');
  const booked = modules.filter((m) => m.booked).length;
  const shown = modules.filter((m) => filter === 'all' || m.category === filter);

  return (
    <Stack gap="20">
      <div className={styles.intro}>
        <p className={styles.text}>{t('catalog.intro')}</p>
        <div className={styles.count}>
          <span className={styles.countValue}>{booked}</span>
          <span>{t('catalog.active', { total: modules.length })}</span>
        </div>
      </div>
      <FilterGroup<Filter>
        label={t('catalog.filter')}
        options={[
          { value: 'all', label: t('category.all') },
          ...MODULE_CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) })),
        ]}
        value={filter}
        onChange={setFilter}
      />
      <div className={styles.grid}>
        {shown.map((m) => (
          <ModuleCard
            key={m.id}
            name={localized(m.name, i18n.language)}
            description={localized(m.description, i18n.language)}
            categoryLabel={t(`category.${m.category}`)}
            core={m.core}
            gxp={m.gxp}
            booked={m.booked}
            headingLevel={2}
            onToggle={() => {
              onToggle(m);
            }}
            {...(m.installed && m.manifest?.nav
              ? {
                  onOpen: () => {
                    onOpen(m.id);
                  },
                }
              : {})}
          />
        ))}
      </div>
    </Stack>
  );
}
