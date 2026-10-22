import { useLine, useTranslation } from '@iot/module-sdk';
import { Card, CardHeader } from '@iot/ui';
import { MODULE_ID } from '../module-id';

/** Startseite des Moduls – nur Komponenten aus @iot/ui, Texte über den Namespace des Moduls. */
export function HomePage() {
  const { t } = useTranslation(MODULE_ID);
  const line = useLine();
  return (
    <Card gap="12">
      <CardHeader title={t('home.title')} subtitle={line.name} />
      <p>{t('home.text')}</p>
    </Card>
  );
}
