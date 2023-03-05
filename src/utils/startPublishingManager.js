import { PublishingManager } from 'lib/publishing';

/**
* @param {import('../.').NS} ns
*/
export async function main(ns) {
    ns.disableLog("ALL");
    const manager = new PublishingManager(ns);
    await manager.run();
}