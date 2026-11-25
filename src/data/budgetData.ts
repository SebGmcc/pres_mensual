export type CategoryId =
  | 'alimentacion'
  | 'transporte'
  | 'servicios'
  | 'compras'
  | 'entretenimiento';

export type IncomeCategory =
  | 'Salario'
  | 'Trabajo independiente'
  | 'Negocio'
  | 'Inversiones'
  | 'Regalo'
  | 'Bonificación'
  | 'Reembolso'
  | 'Otro';

export type PaymentMethod =
  | 'Efectivo'
  | 'Cuenta bancaria'
  | 'Nequi'
  | 'Daviplata'
  | 'Tarjeta'
  | 'Otro';

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salario',
  'Trabajo independiente',
  'Negocio',
  'Inversiones',
  'Regalo',
  'Bonificación',
  'Reembolso',
  'Otro',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Cuenta bancaria',
  'Nequi',
  'Daviplata',
  'Tarjeta',
  'Otro',
];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  barColor: string;
  iconBg: string;
  iconText: string;
  quickConcepts: string[];
}

export interface ExpenseItem {
  id: string;
  type?: 'expense';
  day: number;
  dateLabel: string;
  shortDate: string;
  time: string;
  categoryId: CategoryId;
  concept: string;
  notes?: string;
  amount: number; // En pesos colombianos (COP)
}

export interface IncomeItem {
  id: string;
  type: 'income';
  day: number;
  isoDate: string;
  dateLabel: string;
  shortDate: string;
  time: string;
  incomeCategory: IncomeCategory;
  paymentMethod: PaymentMethod;
  concept: string;
  notes?: string;
  amount: number; // En pesos colombianos (COP)
}

export type MovementItem = (ExpenseItem & { type: 'expense' }) | IncomeItem;

export interface MonthDataset {
  id: 'nov-2026' | 'oct-2026';
  label: string;
  shortMonth: string;
  monthIndex: number; // 1-12
  year: number;
  budgetSubtitle: string;
  currentDay: number;
  totalDays: number;
  monthlyBudget: number;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  alimentacion: {
    id: 'alimentacion',
    label: 'Alimentación',
    barColor: '#38BDF8',
    iconBg: 'bg-emerald-500/15 border border-emerald-500/25',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    quickConcepts: ['Almuerzo', 'Mercado', 'Café y panadería', 'Domicilio'],
  },
  transporte: {
    id: 'transporte',
    label: 'Transporte',
    barColor: '#2DD4BF',
    iconBg: 'bg-sky-500/15 border border-sky-500/25',
    iconText: 'text-sky-600 dark:text-sky-400',
    quickConcepts: ['Recarga transporte', 'Viaje en app', 'Taxi', 'Gasolina'],
  },
  servicios: {
    id: 'servicios',
    label: 'Servicios públicos',
    barColor: '#818CF8',
    iconBg: 'bg-amber-500/15 border border-amber-500/25',
    iconText: 'text-amber-600 dark:text-amber-400',
    quickConcepts: ['Energía eléctrica', 'Agua', 'Internet hogar', 'Plan móvil'],
  },
  compras: {
    id: 'compras',
    label: 'Ropa y compras personales',
    barColor: '#3B82F6',
    iconBg: 'bg-indigo-500/15 border border-indigo-500/25',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    quickConcepts: ['Farmacia', 'Cuidado personal', 'Prenda de vestir', 'Hogar'],
  },
  entretenimiento: {
    id: 'entretenimiento',
    label: 'Entretenimiento y ocio',
    barColor: '#F472B6',
    iconBg: 'bg-pink-500/15 border border-pink-500/25',
    iconText: 'text-pink-600 dark:text-pink-400',
    quickConcepts: ['Cine', 'Salida con amigos', 'Suscripción', 'Concierto o evento'],
  },
};

export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORIES.alimentacion,
  CATEGORIES.servicios,
  CATEGORIES.transporte,
  CATEGORIES.compras,
  CATEGORIES.entretenimiento,
];

const NOVEMBER_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-01',
    day: 1,
    dateLabel: '1 nov 2026',
    shortDate: '1 nov',
    time: '10:15',
    categoryId: 'alimentacion',
    concept: 'Mercado quincenal de despensa',
    notes: 'Granos, proteínas, lácteos y aseo básico para la primera quincena.',
    amount: 165000,
  },
  {
    id: 'exp-02',
    day: 1,
    dateLabel: '1 nov 2026',
    shortDate: '1 nov',
    time: '16:40',
    categoryId: 'transporte',
    concept: 'Recarga transporte urbano',
    notes: 'Saldo semanal para trayectos en transporte público.',
    amount: 25000,
  },
  {
    id: 'exp-03',
    day: 2,
    dateLabel: '2 nov 2026',
    shortDate: '2 nov',
    time: '08:25',
    categoryId: 'alimentacion',
    concept: 'Desayuno y panadería',
    amount: 18500,
  },
  {
    id: 'exp-04',
    day: 3,
    dateLabel: '3 nov 2026',
    shortDate: '3 nov',
    time: '11:05',
    categoryId: 'servicios',
    concept: 'Factura servicio de agua',
    notes: 'Pago bimestral correspondiente al periodo octubre-noviembre.',
    amount: 84000,
  },
  {
    id: 'exp-05',
    day: 3,
    dateLabel: '3 nov 2026',
    shortDate: '3 nov',
    time: '13:15',
    categoryId: 'alimentacion',
    concept: 'Almuerzo corriente',
    amount: 18000,
  },
  {
    id: 'exp-06',
    day: 4,
    dateLabel: '4 nov 2026',
    shortDate: '4 nov',
    time: '18:50',
    categoryId: 'transporte',
    concept: 'Viaje en aplicación',
    notes: 'Regreso a casa por lluvia.',
    amount: 24500,
  },
  {
    id: 'exp-07',
    day: 5,
    dateLabel: '5 nov 2026',
    shortDate: '5 nov',
    time: '09:30',
    categoryId: 'servicios',
    concept: 'Plan de internet hogar',
    notes: 'Mensualidad fibra óptica 300 Mbps.',
    amount: 95000,
  },
  {
    id: 'exp-08',
    day: 5,
    dateLabel: '5 nov 2026',
    shortDate: '5 nov',
    time: '17:20',
    categoryId: 'alimentacion',
    concept: 'Frutas y verduras plaza',
    amount: 42000,
  },
  {
    id: 'exp-09',
    day: 6,
    dateLabel: '6 nov 2026',
    shortDate: '6 nov',
    time: '17:45',
    categoryId: 'entretenimiento',
    concept: 'Café y tarde con amigos',
    amount: 38500,
  },
  {
    id: 'exp-10',
    day: 7,
    dateLabel: '7 nov 2026',
    shortDate: '7 nov',
    time: '15:10',
    categoryId: 'compras',
    concept: 'Camiseta básica de algodón',
    amount: 89000,
  },
  {
    id: 'exp-11',
    day: 7,
    dateLabel: '7 nov 2026',
    shortDate: '7 nov',
    time: '20:30',
    categoryId: 'alimentacion',
    concept: 'Cena fin de semana',
    amount: 54000,
  },
  {
    id: 'exp-12',
    day: 8,
    dateLabel: '8 nov 2026',
    shortDate: '8 nov',
    time: '10:00',
    categoryId: 'entretenimiento',
    concept: 'Suscripción plataforma de cine',
    amount: 32900,
  },
  {
    id: 'exp-13',
    day: 9,
    dateLabel: '9 nov 2026',
    shortDate: '9 nov',
    time: '07:50',
    categoryId: 'transporte',
    concept: 'Recarga tarjeta bus',
    amount: 30000,
  },
  {
    id: 'exp-14',
    day: 10,
    dateLabel: '10 nov 2026',
    shortDate: '10 nov',
    time: '12:10',
    categoryId: 'servicios',
    concept: 'Factura energía eléctrica',
    notes: 'Consumo mensual de electricidad del apartamento.',
    amount: 138000,
  },
  {
    id: 'exp-15',
    day: 11,
    dateLabel: '11 nov 2026',
    shortDate: '11 nov',
    time: '13:05',
    categoryId: 'alimentacion',
    concept: 'Almuerzo ejecutivo',
    amount: 21500,
  },
  {
    id: 'exp-16',
    day: 12,
    dateLabel: '12 nov 2026',
    shortDate: '12 nov',
    time: '09:15',
    categoryId: 'servicios',
    concept: 'Plan móvil mensual',
    amount: 48000,
  },
  {
    id: 'exp-17',
    day: 12,
    dateLabel: '12 nov 2026',
    shortDate: '12 nov',
    time: '21:15',
    categoryId: 'transporte',
    concept: 'Trayecto nocturno',
    amount: 19000,
  },
  {
    id: 'exp-18',
    day: 13,
    dateLabel: '13 nov 2026',
    shortDate: '13 nov',
    time: '16:00',
    categoryId: 'compras',
    concept: 'Productos de farmacia',
    amount: 64000,
  },
  {
    id: 'exp-19',
    day: 14,
    dateLabel: '14 nov 2026',
    shortDate: '14 nov',
    time: '19:00',
    categoryId: 'entretenimiento',
    concept: 'Boletas cine y crispetas',
    notes: 'Función nocturna fin de semana.',
    amount: 76000,
  },
  {
    id: 'exp-20',
    day: 14,
    dateLabel: '14 nov 2026',
    shortDate: '14 nov',
    time: '21:40',
    categoryId: 'alimentacion',
    concept: 'Domicilio cena',
    amount: 46000,
  },
  {
    id: 'exp-21',
    day: 15,
    dateLabel: '15 nov 2026',
    shortDate: '15 nov',
    time: '11:30',
    categoryId: 'alimentacion',
    concept: 'Mercado segunda quincena',
    notes: 'Reposición de despensa, carnes y verduras.',
    amount: 185000,
  },
  {
    id: 'exp-22',
    day: 16,
    dateLabel: '16 nov 2026',
    shortDate: '16 nov',
    time: '15:45',
    categoryId: 'compras',
    concept: 'Pantalón casual',
    amount: 129000,
  },
  {
    id: 'exp-23',
    day: 17,
    dateLabel: '17 nov 2026',
    shortDate: '17 nov',
    time: '10:20',
    categoryId: 'servicios',
    concept: 'Servicio de gas domiciliario',
    amount: 42000,
  },
  {
    id: 'exp-24',
    day: 17,
    dateLabel: '17 nov 2026',
    shortDate: '17 nov',
    time: '18:05',
    categoryId: 'transporte',
    concept: 'Recarga movilidad semanal',
    amount: 25000,
  },
  {
    id: 'exp-25',
    day: 18,
    dateLabel: '18 nov 2026',
    shortDate: '18 nov',
    time: '13:30',
    categoryId: 'alimentacion',
    concept: 'Cafetería y almuerzo',
    amount: 29500,
  },
  {
    id: 'exp-26',
    day: 19,
    dateLabel: '19 nov 2026',
    shortDate: '19 nov',
    time: '19:25',
    categoryId: 'transporte',
    concept: 'Servicio de taxi',
    amount: 22000,
  },
  {
    id: 'exp-27',
    day: 20,
    dateLabel: '20 nov 2026',
    shortDate: '20 nov',
    time: '12:50',
    categoryId: 'alimentacion',
    concept: 'Almuerzo del día',
    notes: 'Menú del día cerca de la oficina.',
    amount: 22000,
  },
  {
    id: 'exp-28',
    day: 21,
    dateLabel: '21 nov 2026',
    shortDate: '21 nov',
    time: '16:15',
    categoryId: 'compras',
    concept: 'Artículos de cuidado personal',
    notes: 'Bloqueador solar y shampoo.',
    amount: 72500,
  },
  {
    id: 'exp-29',
    day: 22,
    dateLabel: '22 nov 2026',
    shortDate: '22 nov',
    time: '17:30',
    categoryId: 'entretenimiento',
    concept: 'Salida cultural y café',
    notes: 'Entrada a exposición y café de especialidad.',
    amount: 64000,
  },
  {
    id: 'exp-30',
    day: 23,
    dateLabel: '23 nov 2026',
    shortDate: '23 nov',
    time: '07:45',
    categoryId: 'transporte',
    concept: 'Recarga transporte urbano',
    notes: 'Recarga para desplazamientos de la semana.',
    amount: 18000,
  },
  {
    id: 'exp-31',
    day: 23,
    dateLabel: '23 nov 2026',
    shortDate: '23 nov',
    time: '09:50',
    categoryId: 'alimentacion',
    concept: 'Compra semanal de víveres',
    notes: 'Frutas, pan integral, huevos y café molido.',
    amount: 118500,
  },
];

const OCTOBER_EXPENSES: ExpenseItem[] = [
  { id: 'oct-01', day: 1, dateLabel: '1 oct 2026', shortDate: '1 oct', time: '10:30', categoryId: 'alimentacion', concept: 'Mercado inicio de mes', amount: 172000 },
  { id: 'oct-02', day: 2, dateLabel: '2 oct 2026', shortDate: '2 oct', time: '08:10', categoryId: 'transporte', concept: 'Recarga transporte urbano', amount: 28000 },
  { id: 'oct-03', day: 4, dateLabel: '4 oct 2026', shortDate: '4 oct', time: '11:20', categoryId: 'servicios', concept: 'Factura energía eléctrica', amount: 132000 },
  { id: 'oct-04', day: 5, dateLabel: '5 oct 2026', shortDate: '5 oct', time: '09:00', categoryId: 'servicios', concept: 'Plan de internet hogar', amount: 95000 },
  { id: 'oct-05', day: 7, dateLabel: '7 oct 2026', shortDate: '7 oct', time: '13:15', categoryId: 'alimentacion', concept: 'Almuerzos semana 1', amount: 64000 },
  { id: 'oct-06', day: 9, dateLabel: '9 oct 2026', shortDate: '9 oct', time: '19:40', categoryId: 'entretenimiento', concept: 'Entradas cine', amount: 58000 },
  { id: 'oct-07', day: 11, dateLabel: '11 oct 2026', shortDate: '11 oct', time: '16:05', categoryId: 'compras', concept: 'Calzado deportivo', amount: 185000 },
  { id: 'oct-08', day: 12, dateLabel: '12 oct 2026', shortDate: '12 oct', time: '10:45', categoryId: 'servicios', concept: 'Factura servicio de agua', amount: 79000 },
  { id: 'oct-09', day: 15, dateLabel: '15 oct 2026', shortDate: '15 oct', time: '12:00', categoryId: 'alimentacion', concept: 'Mercado segunda quincena', amount: 178000 },
  { id: 'oct-10', day: 16, dateLabel: '16 oct 2026', shortDate: '16 oct', time: '07:55', categoryId: 'transporte', concept: 'Recarga movilidad', amount: 32000 },
  { id: 'oct-11', day: 18, dateLabel: '18 oct 2026', shortDate: '18 oct', time: '20:30', categoryId: 'entretenimiento', concept: 'Cena con amigos', amount: 88000 },
  { id: 'oct-12', day: 20, dateLabel: '20 oct 2026', shortDate: '20 oct', time: '09:40', categoryId: 'servicios', concept: 'Plan móvil y gas', amount: 86000 },
  { id: 'oct-13', day: 22, dateLabel: '22 oct 2026', shortDate: '22 oct', time: '17:10', categoryId: 'alimentacion', concept: 'Frutas y panadería', amount: 52000 },
  { id: 'oct-14', day: 25, dateLabel: '25 oct 2026', shortDate: '25 oct', time: '15:25', categoryId: 'compras', concept: 'Accesorios personales', amount: 94000 },
  { id: 'oct-15', day: 27, dateLabel: '27 oct 2026', shortDate: '27 oct', time: '18:50', categoryId: 'transporte', concept: 'Trayectos aplicación', amount: 41000 },
  { id: 'oct-16', day: 29, dateLabel: '29 oct 2026', shortDate: '29 oct', time: '11:15', categoryId: 'alimentacion', concept: 'Compra semanal de víveres', amount: 124000 },
  { id: 'oct-17', day: 30, dateLabel: '30 oct 2026', shortDate: '30 oct', time: '16:45', categoryId: 'entretenimiento', concept: 'Café y librería', amount: 67000 },
  { id: 'oct-18', day: 31, dateLabel: '31 oct 2026', shortDate: '31 oct', time: '13:10', categoryId: 'alimentacion', concept: 'Almuerzo cierre de mes', amount: 28500 },
];

export const INITIAL_MONTH_DATASETS: Record<MonthDataset['id'], MonthDataset> = {
  'nov-2026': {
    id: 'nov-2026',
    label: 'Noviembre 2026',
    shortMonth: 'nov',
    monthIndex: 11,
    year: 2026,
    budgetSubtitle: 'Límite asignado para noviembre',
    currentDay: 24,
    totalDays: 30,
    monthlyBudget: 3200000,
    expenses: [],
    incomes: [],
  },
  'oct-2026': {
    id: 'oct-2026',
    label: 'Octubre 2026',
    shortMonth: 'oct',
    monthIndex: 10,
    year: 2026,
    budgetSubtitle: 'Límite asignado para octubre',
    currentDay: 31,
    totalDays: 31,
    monthlyBudget: 3000000,
    expenses: OCTOBER_EXPENSES,
    incomes: [],
  },
};

export function createEmptyMonthDatasets(): Record<MonthDataset['id'], MonthDataset> {
  return {
    'nov-2026': {
      id: 'nov-2026',
      label: 'Noviembre 2026',
      shortMonth: 'nov',
      monthIndex: 11,
      year: 2026,
      budgetSubtitle: 'Límite asignado para noviembre',
      currentDay: 24,
      totalDays: 30,
      monthlyBudget: 0,
      expenses: [],
      incomes: [],
    },
    'oct-2026': {
      id: 'oct-2026',
      label: 'Octubre 2026',
      shortMonth: 'oct',
      monthIndex: 10,
      year: 2026,
      budgetSubtitle: 'Límite asignado para octubre',
      currentDay: 31,
      totalDays: 31,
      monthlyBudget: 0,
      expenses: [],
      incomes: [],
    },
  };
}

const SPANISH_MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function formatCOP(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted} COP`;
}

export function formatCOPDigits(digitsOnly: string): string {
  if (!digitsOnly) return '';
  const num = Number(digitsOnly);
  if (!Number.isFinite(num) || num <= 0) return '';
  const formatted = Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
}

export function formatShortCOP(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 1000000) {
    const millions = (amount / 1000000).toFixed(1).replace('.', ',');
    return `$${millions}M`;
  }
  if (amount >= 1000) {
    const thousands = Math.round(amount / 1000);
    return `$${thousands}k`;
  }
  return `$${amount}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function parseIsoDateParts(isoDate: string): {
  day: number;
  dateLabel: string;
  shortDate: string;
} {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const year = Number(yStr) || 2026;
  const monthIdx = Math.min(11, Math.max(0, (Number(mStr) || 11) - 1));
  const day = Math.min(31, Math.max(1, Number(dStr) || 23));
  const shortMonth = SPANISH_MONTHS_SHORT[monthIdx];
  return {
    day,
    dateLabel: `${day} ${shortMonth} ${year}`,
    shortDate: `${day} ${shortMonth}`,
  };
}

export function getDefaultIsoDateForMonth(month: MonthDataset): string {
  const m = String(month.monthIndex).padStart(2, '0');
  const d = String(month.currentDay).padStart(2, '0');
  return `${month.year}-${m}-${d}`;
}
