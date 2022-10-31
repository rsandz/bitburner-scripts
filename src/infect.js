const HACK_SCRIPT = "hackTemplate.js";

function _bail(ns, msg) {
	ns.tprint(msg);
	ns.exit();
}

/** 
 * @arg infect_target Computer to infect with hacking scripts.
 * @arg hack_target Computer to hack with scripts.
 * @param {import('.').NS} ns 
 */
export async function main(ns) {
	const bail = (msg) => _bail(ns, msg);
	
	if (ns.args.length < 2) {
		bail("Invalid args.");
	}
	
	const [infect_target, hack_target] = ns.args;

	if (!ns.scp(HACK_SCRIPT, infect_target, "home")) {
		bail(`Could not copy ${HACK_SCRIPT}`);
	}

	if (ns.fileExists("BruteSSH.exe")) {
		ns.brutessh(infect_target);
	}

	ns.nuke(infect_target);
	if (!ns.hasRootAccess(infect_target)) {
		bail(`Could not nuke.`);
	}

	const mem = ns.getServerMaxRam(infect_target);
	const num_threads = Math.floor(mem / ns.getScriptRam(HACK_SCRIPT));

	ns.killall(infect_target)
	const pid = ns.exec(HACK_SCRIPT, infect_target, num_threads, hack_target);
	if (!pid) {
		bail(`Failed to run hack script on ${infect_target}`)
	} else {
		ns.tprint(`Hacking server '${hack_target}' from '${infect_target}' with PID ${pid}.`);
	}
}

export function autocomplete(data, args) {
	return [...data.servers];
}