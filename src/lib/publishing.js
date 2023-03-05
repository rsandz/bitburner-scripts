import { Logger } from 'lib/log';
import { EMPTY_PORT_VALUE, HACK_TARGETS_LIST, Ports } from '/lib/constants';

/**
 * Publishes useful data via ports that can be consumed by other scripts.
 * (With Less RAM use!)
 */
export class PublishingManager {
    
    static UPDATE_PERIOD = 10;
    
    /**
    * @param {import('..').NS} ns
    */
    constructor(ns, serverList = []) {
        this.ns = ns;
        this.serverList = serverList;
    }
    
    getData() {
        const data = {};
        
        this.serverList.forEach((server) => {
            data[server] = {
                security: this.ns.getServerSecurityLevel(server)
            }
        });
        
        return data;
    }

    async publish(data) {
        await this.ns.writePort(Ports.PUBLISHING, JSON.stringify(data));
        this.ns.readPort(Ports.PUBLISHING); // Remove old data
    }

    async run () {
        while (true) {
            await this.publish(this.getData());
            await this.ns.sleep(PublishingManager.UPDATE_PERIOD);
        }
    }
}

export class PublishingClient {
    
    /**
    * @param {import('..').NS} ns
    */
    constructor(ns) {
        this.ns = ns;
    }

    getData() {
        const data = this.ns.peek(Ports.PUBLISHING);
        if (data === EMPTY_PORT_VALUE) {
            return null;
        }
        return JSON.parse(data);
    }
    
    getDataForServer(serverName) {
        const data = this.getData();
        if (data === null) {
            return null;
        } else {
            const serverData = data[serverName];
            if (!serverData) return null;
            return serverData;
        }
    }
}

// =====

/**
* @param {import('..').NS} ns
*/
export async function main(ns) {
    const publishingManager = new PublishingManager(ns, ns.read(HACK_TARGETS_LIST));
    await publishingManager.run();
}