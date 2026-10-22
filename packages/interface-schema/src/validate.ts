import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import activeAlarms from '../schemas/activeAlarms.schema.json';
import alarms from '../schemas/alarms.schema.json';
import batch from '../schemas/batch.schema.json';
import common from '../schemas/common.schema.json';
import counters from '../schemas/counters.schema.json';
import envelope from '../schemas/envelope.schema.json';
import identity from '../schemas/identity.schema.json';
import meta from '../schemas/meta.schema.json';
import state from '../schemas/state.schema.json';
import values from '../schemas/values.schema.json';
import { DATA_CLASSES, type DataClass } from './topics';

// ajv-formats ist CommonJS; je nach Lader liegt die Funktion auf default
const addFormats =
  (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ??
  addFormatsModule;

// strictRequired aus: Pflichtfelder in if/then/else-Zweigen beziehen sich auf properties der Wurzel
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
// Hinweis für die Typerzeugung (json-schema-to-typescript), für die Prüfung ohne Bedeutung
ajv.addKeyword('tsType');
ajv.addSchema(common);

const SCHEMAS = { identity, meta, state, counters, alarms, activeAlarms, values, batch } as const;

const validators = Object.fromEntries(
  DATA_CLASSES.map((dataClass) => [dataClass, ajv.compile(SCHEMAS[dataClass])]),
) as Record<DataClass, ValidateFunction>;
const validateEnvelope = ajv.compile(envelope);

export interface ValidationResult {
  valid: boolean;
  /** Lesbare Fehler, z. B. `data/state: must be equal to one of the allowed values` */
  errors: string[];
}

function format(errors: ErrorObject[] | null | undefined, prefix: string): string[] {
  return (errors ?? []).map((e) => `${prefix}${e.instancePath || '/'}: ${e.message ?? 'ungültig'}`);
}

/**
 * Prüft eine vollständige Nachricht (Umschlag + Daten) gegen das Schema ihrer Datenklasse.
 * Das Feld `schema` muss zur Datenklasse passen.
 */
export function validateMessage(dataClass: DataClass, message: unknown): ValidationResult {
  if (!validateEnvelope(message)) {
    return { valid: false, errors: format(validateEnvelope.errors, 'envelope') };
  }
  const { schema, data } = message as { schema: string; data: unknown };
  const errors: string[] = [];
  if (!schema.startsWith(`iot.${dataClass}/`)) {
    errors.push(`envelope/schema: "${schema}" passt nicht zur Datenklasse ${dataClass}`);
  }
  const validateData = validators[dataClass];
  if (!validateData(data)) errors.push(...format(validateData.errors, 'data'));
  return { valid: errors.length === 0, errors };
}

/** Prüft nur den Inhalt von `data`. */
export function validateData(dataClass: DataClass, data: unknown): ValidationResult {
  const validate = validators[dataClass];
  const valid = validate(data);
  return { valid, errors: valid ? [] : format(validate.errors, 'data') };
}
