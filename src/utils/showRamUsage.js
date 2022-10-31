import { ServerPool } from '/lib/serverPool'
import { HACK_LIST } from '/lib/discovery'

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Shows the current RAM usage in the sidebar.

Usage: run ${ns.getScriptName()} [--help]
    `.trimEnd());
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
    const flagData = ns.flags([
        ['help', false]
    ])

    if (flagData.help) {
        help(ns);
        ns.exit();
    }
    
    const doc = document; // This is expensive! (25GB RAM) Perhaps there's a way around it? ;)
    const hook0 = doc.getElementById('overview-extra-hook-0');
    const hook1 = doc.getElementById('overview-extra-hook-1');

    const followerServers = JSON.parse(ns.read(HACK_LIST));
    const serverPool = new ServerPool(ns, followerServers);
    ns.tail();

    while (true) {
        try {
            const headers = []
            const values = [];

            headers.push("RAM Use");
            values.push(ns.nFormat(serverPool.getUsedMemory() * 1e9,"0.0b"));
            headers.push("RAM Total");
            values.push(ns.nFormat(serverPool.getMaxMemory() * 1e9, "0.0b"));

            // Now drop it into the placeholder elements
            hook0.innerText = headers.join(" \n");
            hook1.innerText = values.join("\n");
        } catch (err) { // This might come in handy later
            ns.print("ERROR: Update Skipped: " + String(err));
        }
        await ns.sleep(1000);
    }

}