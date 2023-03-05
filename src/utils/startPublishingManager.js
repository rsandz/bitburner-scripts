import { HACK_TARGETS_LIST } from 'lib/constants';
import { PublishingManager } from 'lib/publishing';

/**
* @param {import('../.').NS} ns
*/
export async function main(ns) {
    ns.disableLog("ALL");
    const manager = new PublishingManager(ns, JSON.parse(ns.read(HACK_TARGETS_LIST)));
    await manager.run();
}