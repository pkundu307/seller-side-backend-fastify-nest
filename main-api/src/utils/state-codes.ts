// main-api/src/utils/state-codes.ts

export const STATE_CODE_MAP: Record<string, string> = {
  // ── Jammu & Kashmir ──
  'jammu and kashmir': '01',
  'jammu & kashmir': '01',
  'j&k': '01',
  jk: '01',

  // ── Himachal Pradesh ──
  'himachal pradesh': '02',
  hp: '02',

  // ── Punjab ──
  punjab: '03',
  pb: '03',

  // ── Chandigarh ──
  chandigarh: '04',
  ch: '04',

  // ── Uttarakhand ──
  uttarakhand: '05',
  uttaranchal: '05',
  uk: '05',

  // ── Haryana ──
  haryana: '06',
  hr: '06',

  // ── Delhi ──
  delhi: '07',
  'new delhi': '07',
  dl: '07',

  // ── Rajasthan ──
  rajasthan: '08',
  rj: '08',

  // ── Uttar Pradesh ──
  'uttar pradesh': '09',
  up: '09',

  // ── Bihar ──
  bihar: '10',
  br: '10',

  // ── Sikkim ──
  sikkim: '11',
  sk: '11',

  // ── Arunachal Pradesh ──
  'arunachal pradesh': '12',
  ar: '12',

  // ── Nagaland ──
  nagaland: '13',
  nl: '13',

  // ── Manipur ──
  manipur: '14',
  mn: '14',

  // ── Mizoram ──
  mizoram: '15',
  mz: '15',

  // ── Tripura ──
  tripura: '16',
  tr: '16',

  // ── Meghalaya ──
  meghalaya: '17',
  ml: '17',

  // ── Assam ──
  assam: '18',
  as: '18',

  // ── West Bengal ──
  'west bengal': '19',
  wb: '19',

  // ── Jharkhand ──
  jharkhand: '20',
  jh: '20',

  // ── Odisha ──
  odisha: '21',
  orissa: '21',
  od: '21',
  or: '21',

  // ── Chhattisgarh ──
  chhattisgarh: '22',
  cg: '22',

  // ── Madhya Pradesh ──
  'madhya pradesh': '23',
  mp: '23',

  // ── Gujarat ──
  gujarat: '24',
  gj: '24',

  // ── Daman and Diu ──
  'daman and diu': '25',
  'daman & diu': '25',
  dd: '25',

  // ── Dadra and Nagar Haveli ──
  'dadra and nagar haveli': '26',
  'dadra & nagar haveli': '26',
  'dadra and nagar haveli and daman and diu': '26',
  dnh: '26',

  // ── Maharashtra ──
  maharashtra: '27',
  mh: '27',

  // ── Karnataka ──
  karnataka: '29',
  ka: '29',

  // ── Goa ──
  goa: '30',
  ga: '30',

  // ── Lakshadweep ──
  lakshadweep: '31',
  ld: '31',

  // ── Kerala ──
  kerala: '32',
  kl: '32',

  // ── Tamil Nadu ──
  'tamil nadu': '33',
  tn: '33',

  // ── Puducherry ──
  puducherry: '34',
  pondicherry: '34',
  py: '34',

  // ── Andaman and Nicobar Islands ──
  'andaman and nicobar islands': '35',
  'andaman & nicobar islands': '35',
  'andaman and nicobar': '35',
  an: '35',

  // ── Telangana ──
  telangana: '36',
  ts: '36',
  tg: '36',

  // ── Andhra Pradesh ──
  'andhra pradesh': '37',
  ap: '37',

  // ── Ladakh ──
  ladakh: '38',
  la: '38',
};

/**
 * Resolves a state name or abbreviation to its GST state code.
 * Always lowercases input before lookup — fully case-insensitive.
 *
 * @example
 * getStateCode('WB')           // '19'
 * getStateCode('West Bengal')  // '19'
 * getStateCode('kerala')       // '32'
 * getStateCode('KL')           // '32'
 * getStateCode('unknown')      // null
 */
export function getStateCode(input: string): string | null {
  if (!input) return null;
  return STATE_CODE_MAP[input.trim().toLowerCase()] ?? null;
}
