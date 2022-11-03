import { HackManager } from '/lib/hackManager'
import { ServerPool} from '/lib/serverPool'
import { HACK_LIST } from 'lib/discovery'
import { BatchManager } from 'lib/batchManager';

const LOG_FILE = "HackManagerErrorLog.txt";

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Start a HackManager to hack a target server.

Usage: run ${ns.getScriptName()} targetServer --batch [--help]
        
--batch
    Use the batch hacking algorithm if set. Otherwise, use proto batch.
    `.trimEnd());
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
    const flagData = ns.flags([
        ['help', false],
        ['target', ""],
        ['batch', false]
    ])
    
    const target = flagData._[0];

    if (flagData.help || !target) {
        help(ns);
        ns.exit();
    }
    
    ns.disableLog("ALL");
    // ns.tail();

    const followerServers = JSON.parse(ns.read(HACK_LIST));
    const serverPool = new ServerPool(ns, followerServers);
    let hackManager;
    if (flagData.batch) {
        hackManager = new BatchManager(ns, serverPool, target);
        ns.print("Starting batch hack manager...")
    } else {
        hackManager = new HackManager(ns, serverPool, target);
        ns.print("Starting the manager...");
    }
    try {
        await hackManager.run();
    } 
    catch(e) {
        ns.write(LOG_FILE, `${new Date} Hack Manager For [${target}]:\n`, "a");
        ns.write(LOG_FILE, `${e.stack}\n`, "a");
        ns.write(LOG_FILE, `${e.toString()}\n`, "a");
        ns.write(LOG_FILE, '\n', "a");
        ns.tail();
        throw e;
    }
}

export function autocomplete(data, args) {
    return data.servers;
}