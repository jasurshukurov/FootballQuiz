import { useProStore } from '@/hooks/useProStore';

/** Initialize RevenueCat (mock implementation) */
export function initPurchases(): void {
  // In production, configure RevenueCat SDK here
}

/** Purchase pro license. Returns true on success (mock: always succeeds after 1s). */
export async function purchasePro(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      useProStore.getState().setPro(true);
      resolve(true);
    }, 1000);
  });
}

/** Restore previous purchases. Returns true if pro was restored. */
export async function restorePurchases(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isPro = useProStore.getState().isPro;
      resolve(isPro);
    }, 1000);
  });
}

/** Check if user currently has pro status. */
export async function checkProStatus(): Promise<boolean> {
  return useProStore.getState().isPro;
}
