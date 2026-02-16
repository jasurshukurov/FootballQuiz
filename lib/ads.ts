/** Ad unit ID constants (Google test ad IDs) */
export const BANNER_AD_ID = 'ca-app-pub-3940256099942544/6300978111';
export const REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917';

let rewardedAdLoaded = false;

/** Load a rewarded video ad (mock implementation) */
export function loadRewardedAd(): void {
  rewardedAdLoaded = true;
}

/** Show a rewarded ad. Returns true if user earned reward (mock: always succeeds after delay). */
export async function showRewardedAd(): Promise<boolean> {
  if (!rewardedAdLoaded) {
    loadRewardedAd();
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      rewardedAdLoaded = false;
      resolve(true);
    }, 500);
  });
}
