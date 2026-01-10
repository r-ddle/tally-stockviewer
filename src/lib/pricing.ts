export type DerivedPrices = {
  retailPrice: number | null;
  darazPrice: number | null;
  customerPrice: number | null;
  discountPercent: number;
};

const NA = "—";
const DEFAULT_CUSTOMER_DISCOUNT = 10;

export function calculateCustomerPrice(
  retailPrice: number | null,
  discountPercent: number = DEFAULT_CUSTOMER_DISCOUNT
): number | null {
  if (retailPrice == null || !Number.isFinite(retailPrice)) return null;
  return retailPrice * (1 - discountPercent / 100);
}

export function computeDerivedPrices(dealerPrice: number | null): DerivedPrices {
  if (dealerPrice == null || !Number.isFinite(dealerPrice)) {
    return {
      retailPrice: null,
      darazPrice: null,
      customerPrice: null,
      discountPercent: DEFAULT_CUSTOMER_DISCOUNT,
    };
  }
  const retailPrice = dealerPrice / 0.75;
  const darazPrice = dealerPrice / 0.6;
  const customerPrice = calculateCustomerPrice(retailPrice, DEFAULT_CUSTOMER_DISCOUNT);
  return { retailPrice, darazPrice, customerPrice, discountPercent: DEFAULT_CUSTOMER_DISCOUNT };
}

export function computeDerivedPricesWithDiscount(
  dealerPrice: number | null,
  discountPercent: number = DEFAULT_CUSTOMER_DISCOUNT
): DerivedPrices {
  if (dealerPrice == null || !Number.isFinite(dealerPrice)) {
    return {
      retailPrice: null,
      darazPrice: null,
      customerPrice: null,
      discountPercent,
    };
  }
  const retailPrice = dealerPrice / 0.75;
  const darazPrice = dealerPrice / 0.6;
  const customerPrice = calculateCustomerPrice(retailPrice, discountPercent);
  return { retailPrice, darazPrice, customerPrice, discountPercent };
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
