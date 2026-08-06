import Setting from "../../models/setting.js";
import {
  DELIVERY_PRICING_MODE,
  HANDLING_FEE_STRATEGY,
} from "../../constants/finance.js";
import { roundCurrency } from "../../utils/money.js";

const DEFAULT_FINANCE_SETTINGS = {
  deliveryPricingMode: DELIVERY_PRICING_MODE.DISTANCE_BASED,
  customerBaseDeliveryFee: 30,
  riderBasePayout: 30,
  baseDistanceCapacityKm: 0.5,
  incrementalKmSurcharge: 10,
  deliveryPartnerRatePerKm: 5,
  fixedDeliveryFee: 30,
  handlingFeeStrategy: HANDLING_FEE_STRATEGY.HIGHEST_CATEGORY_FEE,
  codEnabled: true,
  onlineEnabled: true,
  // Legacy discount fields (backward compat)
  eAnnadataDiscount1Year: 10,
  eAnnadataDiscount2Years: 20,
  // DBT Tier Config — all admin-configurable
  dbtTier1Years: 1,
  dbtTier1Months: 0,
  dbtTier1Rate: 10,
  dbtTier2Years: 2,
  dbtTier2Months: 0,
  dbtTier2Rate: 20,
};

export function normalizeFinanceSettings(raw = {}) {
  const deliveryPricingMode =
    raw.deliveryPricingMode ||
    raw.pricingMode ||
    DEFAULT_FINANCE_SETTINGS.deliveryPricingMode;

  const customerBaseDeliveryFee = roundCurrency(
    raw.customerBaseDeliveryFee ?? raw.baseDeliveryCharge ?? DEFAULT_FINANCE_SETTINGS.customerBaseDeliveryFee,
  );

  const riderBasePayout = roundCurrency(
    raw.riderBasePayout ?? raw.baseDeliveryCharge ?? DEFAULT_FINANCE_SETTINGS.riderBasePayout,
  );

  const deliveryPartnerRatePerKm = roundCurrency(
    raw.deliveryPartnerRatePerKm ??
      raw.fleetCommissionRatePerKm ??
      DEFAULT_FINANCE_SETTINGS.deliveryPartnerRatePerKm,
  );

  const baseDistanceCapacityKm = Number(
    raw.baseDistanceCapacityKm ?? DEFAULT_FINANCE_SETTINGS.baseDistanceCapacityKm,
  );

  const incrementalKmSurcharge = roundCurrency(
    raw.incrementalKmSurcharge ?? DEFAULT_FINANCE_SETTINGS.incrementalKmSurcharge,
  );

  const fixedDeliveryFee = roundCurrency(
    raw.fixedDeliveryFee ?? raw.baseDeliveryCharge ?? customerBaseDeliveryFee,
  );

  const handlingFeeStrategy =
    raw.handlingFeeStrategy || DEFAULT_FINANCE_SETTINGS.handlingFeeStrategy;

  return {
    deliveryPricingMode,
    pricingMode: deliveryPricingMode,
    customerBaseDeliveryFee,
    riderBasePayout,
    baseDeliveryCharge: customerBaseDeliveryFee,
    baseDistanceCapacityKm: Number.isFinite(baseDistanceCapacityKm)
      ? Math.max(baseDistanceCapacityKm, 0)
      : DEFAULT_FINANCE_SETTINGS.baseDistanceCapacityKm,
    incrementalKmSurcharge,
    deliveryPartnerRatePerKm,
    fleetCommissionRatePerKm: deliveryPartnerRatePerKm,
    fixedDeliveryFee,
    handlingFeeStrategy,
    codEnabled: raw.codEnabled ?? DEFAULT_FINANCE_SETTINGS.codEnabled,
    onlineEnabled: raw.onlineEnabled ?? DEFAULT_FINANCE_SETTINGS.onlineEnabled,
    // Legacy discount fields (backward compat)
    eAnnadataDiscount1Year: Number(raw.eAnnadataDiscount1Year ?? DEFAULT_FINANCE_SETTINGS.eAnnadataDiscount1Year),
    eAnnadataDiscount2Years: Number(raw.eAnnadataDiscount2Years ?? DEFAULT_FINANCE_SETTINGS.eAnnadataDiscount2Years),
    // DBT Tier Config — all admin-configurable
    dbtTier1Years:  Number(raw.dbtTier1Years  ?? DEFAULT_FINANCE_SETTINGS.dbtTier1Years),
    dbtTier1Months: Number(raw.dbtTier1Months ?? DEFAULT_FINANCE_SETTINGS.dbtTier1Months),
    dbtTier1Rate:   Number(raw.dbtTier1Rate   ?? DEFAULT_FINANCE_SETTINGS.dbtTier1Rate),
    dbtTier2Years:  Number(raw.dbtTier2Years  ?? DEFAULT_FINANCE_SETTINGS.dbtTier2Years),
    dbtTier2Months: Number(raw.dbtTier2Months ?? DEFAULT_FINANCE_SETTINGS.dbtTier2Months),
    dbtTier2Rate:   Number(raw.dbtTier2Rate   ?? DEFAULT_FINANCE_SETTINGS.dbtTier2Rate),
  };
}

export async function getOrCreateFinanceSettings({ session } = {}) {
  const query = {};
  const options = session ? { session } : {};
  let settings = await Setting.findOne(query, null, options);

  if (!settings) {
    settings = await Setting.create(
      {
        ...DEFAULT_FINANCE_SETTINGS,
        pricingMode: DEFAULT_FINANCE_SETTINGS.deliveryPricingMode,
        baseDeliveryCharge: DEFAULT_FINANCE_SETTINGS.customerBaseDeliveryFee,
        fleetCommissionRatePerKm: DEFAULT_FINANCE_SETTINGS.deliveryPartnerRatePerKm,
      },
      options,
    );
  }

  return normalizeFinanceSettings(settings.toObject?.() || settings);
}

export async function updateDeliveryFinanceSettings(payload, { session } = {}) {
  const normalized = normalizeFinanceSettings(payload || {});
  const query = {};
  const options = { upsert: true, new: true };
  if (session) options.session = session;

  const updated = await Setting.findOneAndUpdate(query, { $set: normalized }, options);
  return normalizeFinanceSettings(updated.toObject?.() || updated);
}

export { DEFAULT_FINANCE_SETTINGS };
