import { ServerPool } from "lib/serverPool.js";

export const HACK_LIST = 'hackList.txt';

/**
 * Scan all server and get their information.
 * @return {String[]}
 * @param {(String) => void?} forEachServerCb
 */
export function scanRecursive(ns, forEachServerCb) {
	const scanned = [];
	scanRecursiveImpl(ns, "home", scanned, forEachServerCb);
	return scanned;
}

/**
 * @param {import('../.').NS} ns
 * @param {String} server
 * @param {String[]} scanned
 * @param {(String) => void?} forEachServerCb
 */
export function scanRecursiveImpl(ns, server, scanned, forEachServerCb) {
	if (forEachServerCb) forEachServerCb(server);
	scanned.push(server);

	ns.scan(server).forEach((host) => {
		if (scanned.includes(host)) {
			return;
		}
		scanRecursiveImpl(ns, host, scanned, forEachServerCb);
	});
}

/** 
 * @param {import('../.').NS} ns 
 * @return {String[]} List of servers we can run scripts on.
 */
export function autoHack(ns) {
	const hackable = [];
	scanRecursive(ns, (server) => {
		if (ns.fileExists("BruteSSH.exe")) {
			ns.brutessh(server);
		}
		if (ns.fileExists("FTPCrack.exe")) {
			ns.ftpcrack(server);
		}
		if (ns.fileExists("relaySMTP.exe")) {
			ns.relaysmtp(server);
		}
		if (ns.fileExists("HTTPWorm.exe")) {
			ns.httpworm(server);
		}
		if (ns.fileExists("SQLInject,exe")) {
			ns.sqlinject(server);
		}

		try {
			ns.nuke(server);
			hackable.push(server);
		} catch {
			// Ignore if failed.
		}
	});
	return hackable;
}
