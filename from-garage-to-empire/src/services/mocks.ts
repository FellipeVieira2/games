import type { AdService, PurchaseService, AnalyticsService } from './contracts';
// No fake purchase entitlement or reward: integrations must explicitly confirm completion.
export class MockAdService implements AdService {
  async rewarded() {
    return { rewarded: false };
  }
}
export class MockPurchaseService implements PurchaseService {
  async purchase() {
    return { purchased: false };
  }
  async restore() {
    return [];
  }
}
export class ConsoleAnalytics implements AnalyticsService {
  track(event: string, properties?: Record<string, string | number>) {
    if (import.meta.env.DEV) console.debug('[game]', event, properties ?? {});
  }
}
