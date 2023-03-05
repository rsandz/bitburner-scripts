import { MetricsManager } from "lib/metrics";

/**
* @param {import('../.').NS} ns
*/
export async function main(ns) {
    ns.disableLog("ALL");
    const manager = new MetricsManager(ns);
    await manager.run();
}