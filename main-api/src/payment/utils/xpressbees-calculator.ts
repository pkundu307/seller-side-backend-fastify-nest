// src/payment/utils/xpressbees-calculator.ts

export type ShippingZone =
  | 'ALL_BENGAL'
  | 'NE_NORTH_MP'
  | 'SPECIAL'
  | 'REST_OF_INDIA';

const ALL_BENGAL_SET  = new Set(['19']);
const NE_NORTH_MP_SET = new Set(['18','16','13','14','15','17','12','11','23','02','05','04']);
const SPECIAL_SET     = new Set(['01','38','31','35']);

export function getDestinationZone(stateCode: string): ShippingZone {
  if (ALL_BENGAL_SET.has(stateCode))  return 'ALL_BENGAL';
  if (NE_NORTH_MP_SET.has(stateCode)) return 'NE_NORTH_MP';
  if (SPECIAL_SET.has(stateCode))     return 'SPECIAL';
  return 'REST_OF_INDIA';
}

function calcVolumetricGrams(l: number, w: number, h: number): number {
  return (l * w * h) / 5;
}

function chargeableWeight(actual: number, vol: number): number {
  return Math.ceil(Math.max(actual, vol) / 500) * 500;
}

function allBengalRate(g: number): number {
  if (g <= 500)  return 50;
  if (g <= 1000) return 70;
  if (g <= 10000) return 70 + Math.ceil((g - 1000) / 500) * 25;
  const base10 = 70 + Math.ceil((10000 - 1000) / 500) * 25; // 520
  if (g <= 20000) return base10 + Math.ceil((g - 10000) / 1000) * 30;
  return base10 + 10 * 30 + Math.ceil((g - 20000) / 1000) * 25;
}

function restOfIndiaRate(g: number): number {
  if (g <= 500)  return 70;
  if (g <= 1000) return 90;
  if (g <= 10000) return 90 + Math.ceil((g - 1000) / 500) * 40;
  const base10 = 90 + Math.ceil((10000 - 1000) / 500) * 40; // 810
  if (g <= 20000) return base10 + Math.ceil((g - 10000) / 1000) * 40;
  return base10 + 10 * 40 + Math.ceil((g - 20000) / 1000) * 30;
}

function neNorthMpRate(g: number): number {
  if (g <= 500)  return 90;
  if (g <= 1000) return 140;
  if (g <= 10000) return 140 + Math.ceil((g - 1000) / 500) * 60;
  const base10 = 140 + Math.ceil((10000 - 1000) / 500) * 60; // 1220
  return base10 + Math.ceil((g - 10000) / 1000) * 55;
}

function specialZoneRate(g: number): number {
  const kg = Math.max(Math.ceil(g / 1000), 1);
  if (kg <= 5)  return kg * 75;
  if (kg <= 10) return 5 * 75 + (kg - 5) * 70;
  return 5 * 75 + 5 * 70 + (kg - 10) * 60;
}

export function calcXpressbeesRate(grams: number, zone: ShippingZone): number {
  switch (zone) {
    case 'ALL_BENGAL':    return allBengalRate(grams);
    case 'NE_NORTH_MP':   return neNorthMpRate(grams);
    case 'SPECIAL':       return specialZoneRate(grams);
    case 'REST_OF_INDIA': return restOfIndiaRate(grams);
  }
}

export interface ShipmentLineItem {
  businessId:    string;
  weightInGrams: number;
  length:        string | null;
  width:         string | null;
  height:        string | null;
  quantity:      number;
}

/**
 * Calculates total shipping charge for all items.
 * Groups by seller (businessId) — separate shipment per seller.
 */
export function calculateTotalShipping(
  items: ShipmentLineItem[],
  destStateCode: string,
): number {
  const zone = getDestinationZone(destStateCode);

  const sellerMap = new Map<string, ShipmentLineItem[]>();
  for (const item of items) {
    if (!sellerMap.has(item.businessId)) sellerMap.set(item.businessId, []);
    sellerMap.get(item.businessId)!.push(item);
  }

  let totalShipping = 0;

  for (const [, sellerItems] of sellerMap) {
    let actualG = 0;
    let volG    = 0;

    for (const item of sellerItems) {
      actualG += (item.weightInGrams ?? 500) * item.quantity;

      const l = parseFloat(item.length ?? '0');
      const w = parseFloat(item.width  ?? '0');
      const h = parseFloat(item.height ?? '0');
      if (l > 0 && w > 0 && h > 0) {
        volG += calcVolumetricGrams(l, w, h) * item.quantity;
      }
    }

    const chargeable = chargeableWeight(actualG, volG);
    totalShipping   += calcXpressbeesRate(chargeable, zone);
  }

  return totalShipping;
}
