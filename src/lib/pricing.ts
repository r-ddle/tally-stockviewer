export type DerivedPrices = {
  retailPrice: number | null;
  darazPrice: number | null;
};

const NA = "—";

export function computeDerivedPrices(dealerPrice: number | null): DerivedPrices {
  if (dealerPrice == null || !Number.isFinite(dealerPrice)) {
    return {
      retailPrice: null,
      darazPrice: null,
    };
  }
  const retailPrice = dealerPrice / 0.75;
  const darazPrice = dealerPrice / 0.6;
  return { retailPrice, darazPrice };
}

export function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return NA;
  const rounded = Math.round(value);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(rounded);
}

export function formatQty(qty: number | null, unit: string | null): string {
  if (qty == null || !Number.isFinite(qty)) return NA;
  const unitText = unit ? unit.trim() : "";
  const qtyText = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 3 }).format(qty);
  return unitText ? `${qtyText} ${unitText}` : qtyText;
}
