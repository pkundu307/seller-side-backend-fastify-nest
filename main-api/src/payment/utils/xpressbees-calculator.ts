// src/payment/utils/xpressbees-calculator.ts

export type ShippingZone = 'ALL_BENGAL' | 'NE_NORTH_MP' | 'SPECIAL' | 'REST_OF_INDIA';

const BENGAL_CODE = '19';
const NE_NORTH_MP_SET = new Set(['18','16','13','14','15','17','12','11','23','02','05','04']);
const SPECIAL_SET     = new Set(['01','38','31','35']);

// REAL MARKET COD CONSTANTS
const MIN_COD_CHARGE = 45; 
const COD_PERCENTAGE = 0.012; // 1.2%

// ─────────────────────────────────────────────────────────
// WEIGHT HELPERS
// ─────────────────────────────────────────────────────────

function calcVolumetricGrams(l: number, w: number, h: number): number {
  return (l * w * h) / 5;
}

function getChargeableWeight(actual: number, vol: number): number {
  return Math.ceil(Math.max(actual, vol) / 500) * 500;
}

// ─────────────────────────────────────────────────────────
// RATE TABLES (Xpressbees 2025-26)
// ─────────────────────────────────────────────────────────

function allBengalRate(g: number): number {
  if (g <= 500)  return 50;
  if (g <= 1000) return 70;
  if (g <= 10000) return 70 + Math.ceil((g - 1000) / 500) * 25;
  const base10 = 520; 
  if (g <= 20000) return base10 + Math.ceil((g - 10000) / 1000) * 30;
  return 820 + Math.ceil((g - 20000) / 1000) * 25;
}

function restOfIndiaRate(g: number): number {
  if (g <= 500)  return 70;
  if (g <= 1000) return 90;
  if (g <= 10000) return 90 + Math.ceil((g - 1000) / 500) * 40;
  const base10 = 810;
  if (g <= 20000) return base10 + Math.ceil((g - 10000) / 1000) * 40;
  return 1210 + Math.ceil((g - 20000) / 1000) * 30;
}

function neNorthMpRate(g: number): number {
  if (g <= 500)  return 90;
  if (g <= 1000) return 140;
  if (g <= 10000) return 140 + Math.ceil((g - 1000) / 500) * 60;
  return 1220 + Math.ceil((g - 10000) / 1000) * 55;
}

function specialZoneRate(g: number): number {
  const kg = Math.max(Math.ceil(g / 1000), 1);
  if (kg <= 5)  return kg * 75;
  if (kg <= 10) return 375 + (kg - 5) * 70;
  return 725 + (kg - 10) * 60;
}

// ─────────────────────────────────────────────────────────
// UPDATED INTERFACES
// ─────────────────────────────────────────────────────────

export interface ShipmentLineItem {
  businessId:      string;
  weightInGrams:   number;
  quantity:        number;
  length:          string | null;
  width:           string | null;
  height:          string | null;
  // Optional for backward compatibility
  supplyStateCode?: string; 
  price?:           number; 
}

export interface LogisticsResult {
  totalShipping: number;
  totalCod:      number;
  grandTotal:    number;
}

// ─────────────────────────────────────────────────────────
// NEW MASTER CALCULATOR
// ─────────────────────────────────────────────────────────

export function calculateLogistics(
  items: ShipmentLineItem[],
  destStateCode: string,
  isCod: boolean = false
): LogisticsResult {
  
  const sellerMap = new Map<string, ShipmentLineItem[]>();
  for (const item of items) {
    if (!sellerMap.has(item.businessId)) sellerMap.set(item.businessId, []);
    sellerMap.get(item.businessId)!.push(item);
  }

  let totalShipping = 0;
  let totalCod      = 0;

  for (const [, sellerItems] of sellerMap) {
    let actualG       = 0;
    let volG          = 0;
    let sellerSubtotal = 0;
    // Default to BENGAL if missing to preserve old logic behavior
    const originCode  = sellerItems[0]?.supplyStateCode || BENGAL_CODE; 

    for (const item of sellerItems) {
      const qty = item.quantity;
      sellerSubtotal += (item.price || 0) * qty;
      actualG        += (item.weightInGrams ?? 500) * qty;

      const l = parseFloat(item.length ?? '0');
      const w = parseFloat(item.width  ?? '0');
      const h = parseFloat(item.height ?? '0');
      if (l > 0 && w > 0 && h > 0) {
        volG += calcVolumetricGrams(l, w, h) * qty;
      }
    }

    let zone: ShippingZone = 'REST_OF_INDIA';
    if (destStateCode === BENGAL_CODE && originCode === BENGAL_CODE) {
      zone = 'ALL_BENGAL';
    } else if (SPECIAL_SET.has(destStateCode)) {
      zone = 'SPECIAL';
    } else if (NE_NORTH_MP_SET.has(destStateCode)) {
      zone = 'NE_NORTH_MP';
    }

    const chargeable = getChargeableWeight(actualG, volG);
    let shipRate = 0;
    switch (zone) {
      case 'ALL_BENGAL':    shipRate = allBengalRate(chargeable); break;
      case 'NE_NORTH_MP':   shipRate = neNorthMpRate(chargeable); break;
      case 'SPECIAL':       shipRate = specialZoneRate(chargeable); break;
      case 'REST_OF_INDIA': shipRate = restOfIndiaRate(chargeable); break;
    }
    totalShipping += shipRate;

    if (isCod) {
      totalCod += Math.max(MIN_COD_CHARGE, sellerSubtotal * COD_PERCENTAGE);
    }
  }

  return { totalShipping, totalCod, grandTotal: totalShipping + totalCod };
}

// ─────────────────────────────────────────────────────────
// ✅ BACKWARD COMPATIBILITY LAYER
// ─────────────────────────────────────────────────────────

/**
 * OLD FUNCTION NAME: calculateTotalShipping
 * Existing code calls this expecting a single number.
 */
export function calculateTotalShipping(
  items: ShipmentLineItem[],
  destStateCode: string,
): number {
  // We call the new logic but only return the shipping part
  const result = calculateLogistics(items, destStateCode, false);
  return result.totalShipping;
}