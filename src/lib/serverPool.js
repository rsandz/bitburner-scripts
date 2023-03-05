/**
 * Class to aggregate multiple servers into a single pool
 * and manage operations on them.
 */
export class ServerPool {

	/** 
	 * @param {import('../.').NS} ns
	 * @param {String[]} servers 
	 * @param {Number} stagger Stagger time in ms
	 */
	constructor(ns, servers, stagger = 0) {
		/** @type {import('../.').NS} */
		this.ns = ns;
		this.servers = servers;
		this.stagger = stagger;
		this.logging = false;
		this.sharding = true;
		this.allowPartialDeploy = false;
	}
	
	setLogging(enabled) {
		this.logging = enabled;
	}
	
	setSharding(enabled) {
		this.sharding = enabled;
	}
	
	setPartialDeploy(enabled) {
		this.allowPartialDeploy = enabled;
	}
	
	log(msg) {
		if (this.logging) this.ns.print(msg);
	}

	getMaxMemory() {
		const serverMemoryMapper = (host) => this.ns.getServerMaxRam(host);
		return this.servers.map(serverMemoryMapper).reduce((prev, curr) => prev + curr, 0);
	}

	getUsedMemory() {
		const serverMemoryMapper = (host) => this.ns.getServerUsedRam(host);
		return this.servers.map(serverMemoryMapper).reduce((prev, curr) => prev + curr, 0)
	}

	getRemainingMemory() {
		const serverMemoryMapper = this.getServerRemainingRam.bind(this);
		return this.servers.map(serverMemoryMapper).reduce((prev, curr) => prev + curr, 0);
	}

	/**
	 * @param {String} host
	 */
	getServerRemainingRam(host) {
		if (host === 'home') {
			// Only allow up to 40% Usage
			const left = (this.ns.getServerMaxRam(host) * 0.40) - this.ns.getServerUsedRam(host);
			return left < 0 ? 0 : left;
		}
		return this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);
	}

	/**
	 * @param {Number} scriptRam
	 */
	getRamMaxDeployableThreads(scriptRam) {
		return this.servers.map((host) => {
			return Math.floor(this.getServerRemainingRam(host) / scriptRam);
		}).reduce((prev, curr) => prev + curr, 0);
	}

	/**
	 * @param {String} scriptName
	 */
	getScriptMaxDeployableThreads(scriptName) {
		if (!this.ns.fileExists(scriptName)) throw new Error("Script does not exist.");
		return this.getRamMaxDeployableThreads(this.ns.getScriptRam(scriptName));
	}

	/**
	 * @param {String} scriptName
	 * @param {Number} threads
	 * @param {Any[]} args
	 * @return Object
	 */
	async deploy(scriptName, threads, ...args) {
		if (!this.ns.fileExists(scriptName)) {
			throw new Error(`Cannot find script '${scriptName}' in host server.`);
		}
		
		const requiredMem = this.ns.getScriptRam(scriptName);
		const [isDeployable, manifest] = this.getDeploymentManifest(requiredMem, threads);

		if (!this.allowPartialDeploy && !isDeployable) {
			const remainingMem = this.getRemainingMemory();
			throw new Error(`Not enough memory in pool to deploy ${threads} threads of ${scriptName}. Needs: ${requiredMem * threads} Gb. Have ${remainingMem} Gb`);
		}

		this.log(`Deployment manifest for ${scriptName} on ${threads} threads:`);
		this.log(manifest);

		for (const [host, serverThreads] of Object.entries(manifest)) {
			if (this.stagger) await this.ns.sleep(this.stagger);
			this._copyRun(scriptName, host, serverThreads, ...args);
		}

		return manifest;
	}

	/**
	 * Get how many threads to deploy to each server.
	 * Allows sharding of threads.
	 * @return {[Boolean, Object]} If deployable and manifest
	 */
	getDeploymentManifest(scriptRam, threads) {
		this.log(`Finding manifest for ${scriptRam}GB * ${threads} threads.`)
		let remainingThreads = threads;
		let threadsToTryToDeploy = threads;
		const manifest = {};

		if (!this.sharding) {
			const server = this.servers.find((host) => {
				return this.getServerRemainingRam(host) > (scriptRam * threadsToTryToDeploy);
			});
			if (!server) {
				return [false, manifest];
			} 

			manifest[server] = threadsToTryToDeploy;
			return [true, manifest];
		}

		while (remainingThreads > 0) {
			const server = this.servers.find((host) => {
				if (host in manifest) return false;
				return this.getServerRemainingRam(host) > (scriptRam * threadsToTryToDeploy);
			});
			if (!server && threadsToTryToDeploy === 1) {
				return [false, manifest];
			} else if (!server && threadsToTryToDeploy > 1) {
				threadsToTryToDeploy--;
			} else {
				// Make sure we don't overdeploy if remainingThreads > threadsToTryToDeploy
				threadsToTryToDeploy = Math.min(remainingThreads, threadsToTryToDeploy);
				
				remainingThreads -= threadsToTryToDeploy;
				manifest[server] = threadsToTryToDeploy;
			}
		}
		return [true, manifest];
	}

	/**
	 * @param {String} scriptName
	 * @param {String} targetServer
	 * @param {Number} threads
	 * @param {Any[]} args
	 */
	_copyRun(scriptName, targetServer, threads, ...args) {
		if (!this.ns.scp(scriptName, targetServer)) {
			throw new Error(`Failed to copy ${scriptName} to ${targetServer}`);
		}
		
		// Helps when script is re-run after restart.
		this.ns.kill(scriptName, targetServer, ...args);
		const pid = this.ns.exec(scriptName, targetServer, threads, ...args);
		if (pid > 0) {
			this.log(`Ran ${scriptName} on ${targetServer} with PID ${pid}`);
		} else {
			const requiredMem = this.ns.getScriptRam(scriptName) * threads;
			const availableMem = this.getServerRemainingRam(targetServer);
			let errMsg = `Failed to run ${scriptName} on ${targetServer} with ${threads} threads. Need ${requiredMem} GB, but ${availableMem} GB available.`
			errMsg += `Server Info:\n${JSON.stringify(this.ns.getServer(targetServer))}`;
			throw new Error(errMsg);
		}
	}

	killAll() {
		this.servers.forEach(host => this.ns.killall(host, true));
	}

}


/** @param {NS} ns */
export async function main(ns) {
	const pool = new ServerPool(ns, [...ns.getPurchasedServers()], 10000);
	pool.killAll();

	const numThreads = pool.getScriptMaxDeployableThreads("hackTemplate.js");
	ns.tprint(`Max memory = ${pool.getMaxMemory()}`);
	ns.tprint(`Threads = ${numThreads}`);
	
	const manifest = await pool.deploy("hackTemplate.js", numThreads, "iron-gym");
	ns.tprint(manifest);
}