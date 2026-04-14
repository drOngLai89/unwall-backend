import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const ENTITLEMENT_ID = 'pro';

function getApiKey() {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_RC_APPLE_KEY;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_RC_GOOGLE_KEY;
  return undefined;
}

export async function configureRevenueCat(appUserID: string) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('RevenueCat public key is missing.');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey, appUserID });
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (error) {
    console.warn('Failed to fetch offerings', error);
    return null;
  }
}

export async function hasProEntitlement(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
  } catch (error) {
    console.warn('Failed to fetch customer info', error);
    return false;
  }
}

export async function buyPackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const result = await Purchases.purchasePackage(pkg);
    return Boolean(result.customerInfo.entitlements.active[ENTITLEMENT_ID]);
  } catch (error) {
    console.warn('Purchase failed', error);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
  } catch (error) {
    console.warn('Restore failed', error);
    return false;
  }
}
