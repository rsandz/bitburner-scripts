const TARGET_FILE = "/targetList.txt";
const HACK_MANAGER_START_SCRIPT = '/utils/startHackManager.js';

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Starts Hack Managers based on a file.

Usage: run ${ns.getScriptName()} [targetFile] [--restart] [--batch]
        
targetFile

    If not provided, will default to ${TARGET_FILE}.
        
--restart

    Kills all running hack managers to restart them.
        
--batch 

    Use the batch algorithm.
    `.trimEnd());
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
    const flagData = ns.flags([
        ['help', false],
        ['restart', false],
        ['batch', false]
    ])
    
    const targetFile = flagData._[0] ?? TARGET_FILE;

    if (flagData.help) {
        help(ns);
        ns.exit();
    }
    
    ns.disableLog("ALL");

    /** @type {String[]} */
    const targets = JSON.parse(ns.read(targetFile));
    
    targets.forEach((server) => {
        let runningScript = ns.getRunningScript(HACK_MANAGER_START_SCRIPT, ns.getHostname(), server) ||
            ns.getRunningScript(HACK_MANAGER_START_SCRIPT, ns.getHostname(), server, '--batch');

        if (flagData.restart && runningScript) {
            if (!ns.kill(runningScript.pid)) {
                throw new Error(`Failed to restart manager for ${server}`);
            }
            ns.tprint(`Killed Manager with PID '${runningScript.pid}' for target '${server}'`);
            runningScript = null;
        }

        if (!runningScript) {
            if (!ns.hasRootAccess(server)) {
                ns.tprint(`Skipping target '${server}' since no root access`);
                return
            }
            if (flagData.batch) {
                if (ns.run(HACK_MANAGER_START_SCRIPT, 1, server, '--batch') < 0) {
                    throw new Error(`Failed to start for target '${server}'`);
                }
                ns.tprint(`Deployed Batch Manager for target '${server}'`);
            } else {
                if (ns.run(HACK_MANAGER_START_SCRIPT, 1, server) < 0) {
                    throw new Error(`Failed to start for target '${server}'`);
                }
                ns.tprint(`Deployed Manager for target '${server}'`);
            }
        }
    });
    
    const running = ns.ps();

    // Kill hack managers that should be running
    running.forEach((process) => {
        if (process.filename !== HACK_MANAGER_START_SCRIPT) {
            return;
        }
        
        const hackTarget = process.args[0];
        const pid = process.pid;
        if (!hackTarget) {
            ns.tprint(`Warning: Unknown hack target for pid ${pid}`);
            return;
        }

        if (targets.includes(hackTarget)) {
            return;
        } 

        ns.tprint(`Killing process ${pid} hacking ${hackTarget}`);
        ns.kill(process.pid);
    })
}

export function autocomplete(data, args) {
    data.files;
}
    
    