// Global Constants
let maxDepth = 0;
/** @type {String[]} */
let visited = [];

/** @param {NS} ns */
export async function main(ns) {
	maxDepth = ns.args[0] ?? 1;
	visited = [];
	visit(ns, "home", 1)
}

/**
 * @param {Number} amount
 */
function humanReadableMoney(amount) {
	const mapping = {
		0: '',
		1: 'k',
		2: 'm',
		3: 'b',
		4: 't',
		5: 'q'
	};

	let depth = 0;
	while (amount >= 1000) {
		depth++;
		amount /= 1000;
	}
	return amount.toPrecision(3) + mapping[depth];
}

/** 
 * Visit a node and get its info.
 * @param {NS} ns 
 * @param {String} server
 * @param {Number} currDepth
 */
function visit(ns, server, currDepth) {
	if (server.match(/pserv/)) {
		return;
	}
	
	if (visited.includes(server)) {
		return;
	} else {
		visited.push(server);
	}

	const indent = " ".repeat((currDepth - 1) * 2);
	const maxMoney = humanReadableMoney(ns.getServerMaxMoney(server));
	const maxRam = ns.getServerMaxRam(server) + "gb";
	ns.tprint(indent + `${currDepth} - ${server}`);
	ns.tprint(indent + `  Max Money = ${maxMoney}`);
	ns.tprint(indent + `  Max RAM = ${maxRam}`);
	
	if (currDepth < maxDepth) {
		const connected = ns.scan(server);
		connected.forEach((toVisit) => visit(ns, toVisit, currDepth + 1));
	}
}