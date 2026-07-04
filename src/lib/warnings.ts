import type { HarmType } from './categories';

function harmPhrase(harm: HarmType): string {
  switch (harm) {
    case 'cancer':
      return 'cancer';
    case 'reproductive':
      return 'birth defects or other reproductive harm';
    case 'both':
      return 'cancer and birth defects or other reproductive harm';
  }
}

export function generateShortText(harm: HarmType): string {
  const label =
    harm === 'both'
      ? 'Cancer and Reproductive Harm'
      : harm === 'cancer'
        ? 'Cancer'
        : 'Reproductive Harm';
  return `\u26A0 WARNING: ${label} - www.P65Warnings.ca.gov`;
}

export function generateLongText(chemicals: string[], harm: HarmType): string {
  const list = chemicals.filter(Boolean);
  const chemStr = list.length > 0 ? list.join(', ') : 'chemicals';
  const verb = list.length === 1 ? 'is' : 'are';
  return `\u26A0 WARNING: This product can expose you to chemicals including ${chemStr}, which ${verb} known to the State of California to cause ${harmPhrase(harm)}. For more information go to www.P65Warnings.ca.gov.`;
}

export function generateWarning(chemicals: string[], harm: HarmType) {
  return {
    short_text: generateShortText(harm),
    long_text: generateLongText(chemicals, harm),
  };
}
