export type HarmType = 'cancer' | 'reproductive' | 'both';

export interface CategoryInfo {
  label: string;
  chemicals: string[];
  harm: HarmType;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  costume_jewelry: {
    label: 'Costume jewelry / imitation leather goods',
    chemicals: ['Lead', 'Cadmium'],
    harm: 'both',
  },
  ceramics: {
    label: 'Ceramics / glazed cookware',
    chemicals: ['Lead', 'Cadmium'],
    harm: 'cancer',
  },
  vinyl_pvc: {
    label: 'Vinyl / PVC products (raincoats, bags, mats)',
    chemicals: ['Phthalates (DEHP)'],
    harm: 'reproductive',
  },
  footwear: {
    label: 'Footwear',
    chemicals: ['Phthalates (BBP)'],
    harm: 'reproductive',
  },
  toys: {
    label: 'Toys / plastic children\u2019s items',
    chemicals: ['Phthalates'],
    harm: 'reproductive',
  },
  apparel: {
    label: 'Apparel / textiles',
    chemicals: ['Formaldehyde'],
    harm: 'cancer',
  },
  batteries_electronics: {
    label: 'Rechargeable batteries / electronics',
    chemicals: ['Cadmium'],
    harm: 'both',
  },
  appliances: {
    label: 'Household appliances (plastic components)',
    chemicals: ['Phthalates', 'Flame retardants'],
    harm: 'both',
  },
  cosmetics: {
    label: 'Cosmetics / personal care products',
    chemicals: ['Lead'],
    harm: 'reproductive',
  },
  supplements: {
    label: 'Dietary supplements',
    chemicals: ['Cadmium', 'Lead'],
    harm: 'both',
  },
  ecigarettes: {
    label: 'E-cigarettes / vape products',
    chemicals: ['Nicotine', 'Lead'],
    harm: 'both',
  },
  furniture: {
    label: 'Furniture (upholstered, pressed wood)',
    chemicals: ['Formaldehyde'],
    harm: 'cancer',
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export function categoryLabel(key: string | null | undefined): string {
  if (!key) return 'Uncategorized';
  return CATEGORIES[key]?.label ?? key;
}

export function categoryInfo(key: string | null | undefined): CategoryInfo | null {
  if (!key) return null;
  return CATEGORIES[key] ?? null;
}
