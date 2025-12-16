export function computeDerivedPrices(dealerPrice: number | null): {
  retailPrice: number | null;
  darazPrice: number | null;
  customerPrice: number | null;
  institutionPrice: number | null;
} {
  if (dealerPrice == null || !Number.isFinite(dealerPrice)) {
    return {
      retailPrice: null,
      darazPrice: null,
      customerPrice: null,
      institutionPrice: null,
    };
  }
  const retailPrice = dealerPrice / 0.75;
  const darazPrice = dealerPrice / 0.6;
  const customerPrice = retailPrice * 0.9;
  const institutionPrice = retailPrice * 0.85;
  return { retailPrice, darazPrice, customerPrice, institutionPrice };
}

export function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQty(qty: number | null, unit: string | null): string {
  if (qty == null || !Number.isFinite(qty)) return "N/A";
  const unitText = unit ? unit.trim() : "";
  return unitText ? `${qty} ${unitText}` : String(qty);
}
