import { MetricsClient } from 'lib/metrics';
import { PublishingClient } from 'lib/publishing';

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
            report({server: serverName, security: serverData.security});
            if (security > 0) {
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