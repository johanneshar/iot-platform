import {
  useLine,
  usePermission,
  useRequestSignature,
  useTranslation,
  type SignatureResult,
} from '@iot/module-sdk';
import { Button, Card, CardHeader, SuccessNote } from '@iot/ui';
import { useState } from 'react';
import { MODULE_ID } from '../module-id';

/** Startseite des Beispielmoduls – zeigt Linie, Übersetzungen und e-Signatur über das SDK. */
export function HomePage() {
  const { t } = useTranslation(MODULE_ID);
  const line = useLine();
  const canSign = usePermission('example.sign');
  const requestSignature = useRequestSignature();
  const [signed, setSigned] = useState<SignatureResult | null>(null);

  const sign = async () => {
    const result = await requestSignature({
      meaning: t('home.meaning'),
      permission: 'example.sign',
      action: 'example.demo-signed',
      subject: t('home.subject'),
      newValue: t('home.subject'),
    });
    if (result) setSigned(result);
  };

  return (
    <Card gap="12">
      <CardHeader title={t('home.title')} subtitle={line.name} />
      <p>{t('home.text')}</p>
      {canSign && !signed && (
        <div>
          <Button onClick={() => void sign()}>{t('home.sign')}</Button>
        </div>
      )}
      {signed && (
        <SuccessNote title={t('home.signed')}>
          {t('home.signedBy', { user: signed.userName })}
        </SuccessNote>
      )}
    </Card>
  );
}
