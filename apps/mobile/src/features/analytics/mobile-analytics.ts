import { MobileAnalytics } from "./analytics-core";
import { mobileReportQueue } from "./failure-reports";

// Keep the public interface. OpenBotFR has no mobile analytics client.
export const mobileAnalytics = new MobileAnalytics(() => null, mobileReportQueue);
