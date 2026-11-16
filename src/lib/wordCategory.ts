export const BUILTIN_CATEGORY_IDS = new Set(['school', 'clinic', 'bank', 'general']);

const KEYWORD_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'school',
    keywords: [
      'school', 'teacher', 'homework', 'grade', 'class', 'classroom', 'principal',
      'counselor', 'report card', 'attendance', 'iep', 'tutoring', 'library',
      'recess', 'cafeteria', 'graduation', 'exam', 'test', 'student', 'uniform',
      'escuela', 'maestro', 'tarea', 'calificacion', 'clase',
    ],
  },
  {
    category: 'clinic',
    keywords: [
      'doctor', 'clinic', 'hospital', 'nurse', 'fever', 'pain', 'allergy',
      'asthma', 'vaccine', 'shot', 'appointment', 'blood', 'x-ray', 'symptom',
      'emergency', 'insurance', 'checkup', 'pediatrician', 'injury', 'cough',
      'medico', 'clinica', 'dolor', 'fiebre', 'alergia', 'vacuna',
    ],
  },
  {
    category: 'bank',
    keywords: [
      'bank', 'account', 'deposit', 'withdraw', 'balance', 'savings', 'checking',
      'loan', 'interest', 'fee', 'atm', 'card', 'pin', 'routing', 'statement',
      'transfer', 'check', 'signature', 'credit', 'debit', 'mortgage',
      'banco', 'cuenta', 'deposito', 'saldo', 'tarjeta', 'firma',
    ],
  },
  {
    category: 'Pharmacy',
    keywords: [
      'pharmacy', 'medicine', 'medication', 'prescription', 'refill', 'pill',
      'tablet', 'syrup', 'dosage', 'inhaler', 'ointment', 'antibiotic', 'drugstore',
      'farmacia', 'medicina', 'receta', 'pastilla', 'jarabe',
    ],
  },
  {
    category: 'Dental',
    keywords: [
      'dentist', 'dental', 'tooth', 'teeth', 'toothache', 'cavity', 'gums',
      'braces', 'cleaning', 'filling', 'crown', 'molar',
      'dentista', 'diente', 'muela', 'caries',
    ],
  },
  {
    category: 'Housing',
    keywords: [
      'rent', 'lease', 'landlord', 'apartment', 'house', 'tenant', 'eviction',
      'security deposit', 'maintenance', 'repair', 'heat', 'mold', 'mortgage',
      'alquiler', 'renta', 'contrato', 'apartamento', 'casero',
    ],
  },
  {
    category: 'Transportation',
    keywords: [
      'bus', 'train', 'subway', 'metro', 'ticket', 'fare', 'pass', 'driver',
      'license', 'dmv', 'car', 'parking', 'traffic', 'route', 'stop', 'station',
      'autobus', 'tren', 'licencia', 'estacion', 'boleto',
    ],
  },
  {
    category: 'Utilities',
    keywords: [
      'electric', 'electricity', 'water', 'gas', 'internet', 'phone bill',
      'utility', 'meter', 'outage', 'disconnect', 'billing',
      'electricidad', 'agua', 'factura', 'recibo',
    ],
  },
  {
    category: 'Work & Jobs',
    keywords: [
      'job', 'work', 'employer', 'boss', 'paycheck', 'salary', 'wage', 'shift',
      'schedule', 'resume', 'interview', 'overtime', 'benefits', 'w-2', 'tax',
      'trabajo', 'empleo', 'salario', 'horario', 'entrevista',
    ],
  },
  {
    category: 'Groceries',
    keywords: [
      'food', 'grocery', 'groceries', 'supermarket', 'milk', 'bread', 'fruit',
      'vegetable', 'meat', 'receipt', 'coupon', 'snap', 'wic', 'market',
      'comida', 'supermercado', 'mercado', 'fruta', 'verdura',
    ],
  },
  {
    category: 'Childcare',
    keywords: [
      'daycare', 'preschool', 'childcare', 'babysitter', 'diaper', 'formula',
      'pickup', 'drop-off', 'nap', 'playground',
      'guarderia', 'preescolar', 'panal',
    ],
  },
  {
    category: 'Legal & Official',
    keywords: [
      'court', 'lawyer', 'attorney', 'notary', 'passport', 'visa', 'id card',
      'birth certificate', 'marriage', 'social security', 'deadline', 'form',
      'application', 'reference number', 'permit', 'official',
      'abogado', 'corte', 'pasaporte', 'acta', 'certificado', 'permiso',
    ],
  },
];

export function normalizeCategoryName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 32);
  if (!cleaned) return 'general';
  const lower = cleaned.toLowerCase();
  if (lower === 'school' || lower === 'school meeting') return 'school';
  if (lower === 'clinic' || lower === 'clinic / doctor' || lower === 'medical' || lower === 'health') {
    return 'clinic';
  }
  if (lower === 'bank' || lower === 'bank / official' || lower === 'banking') return 'bank';
  if (lower === 'general' || lower === 'other' || lower === 'misc') return 'general';

  return cleaned
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

export function inferWordCategoryFallback(
  userWord: string,
  localWord: string,
  existingCategories: string[] = [],
): string {
  const combined = `${localWord} ${userWord}`.toLowerCase();

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      return rule.category;
    }
  }

  for (const existing of existingCategories) {
    const norm = existing.trim().toLowerCase();
    if (norm && !BUILTIN_CATEGORY_IDS.has(norm) && combined.includes(norm)) {
      return normalizeCategoryName(existing);
    }
  }

  return 'general';
}
