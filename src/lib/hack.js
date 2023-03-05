import { MetricsClient } from 'lib/metrics';
import { PublishingClient } from 'lib/publishing';
import { MONEY_DRIFT_THRESHOLD, SECURITY_DRIFT_THRESHOLD } from 'lib/constants';

/** @typedef {import('../.').NS} NS*/

/** @param {NS} ns */
export async function main(ns) {
    if (!ns.args[0]) throw Error("Provide a server to hack.");
    if (ns.args[1]) {
        await ns.sleep(ns.args[1]);
    }
    
    const serverName = ns.args[0];

    const metricsClient = new MetricsClient(ns);
    const publishingClient = new PublishingClient(ns);
    await metricsClient.instrument("hack", async (report) => {
        const serverData = publishingClient.getDataForServer(serverName);
        
        if (serverData) {
            report({
              server: serverName,
              securityDelta: serverData.security - serverData.minSecurity,
              moneyDelta: `-${serverData.maxMoney - serverData.money}`,
            });
            if (serverData.security > serverData.minSecurity * (SECURITY_DRIFT_THRESHOLD - 0.1) 
                || serverData.money < serverData.maxMoney * (MONEY_DRIFT_THRESHOLD + 0.15)) {
                report({skip: 1});
            } else {
                await ns.hack(serverName);
                report({skip: 0});
            }
            return
        } else {
            // Fallback to just hacking
            await ns.hack(serverName);
            report({skip: 0, noPublishedData: 1});
        }
    })
}