import { FileHandler, Logger } from "lib/log";

const EMPTY_PORT_STRING = "NULL PORT DATA";

export class MetricsManager {
    /**
     * Port used to receive metrics
     */
    static PORT = 20;

    /**
     * Polling period for metric port in ms.
     */
    static POLL_PERIOD = 500;

    /**
    * @param {import('../.').NS} ns
    */
    constructor(ns) {
        this.ns = ns;
        this.log = Logger.withDefaultConfig(ns);
        this.metricsLogger = new Logger(
            ns,
            [new FileHandler(ns, "metrics")],
            []
        )
    }
    
    async run () {
        this.log.info("Metric Manager Started.");
        this.log.info(`Using port ${MetricsManager.PORT}`);

        while (true) {
            const data = this.ns.readPort(MetricsManager.PORT);

            if (data !== EMPTY_PORT_STRING) {
                this.log.info(`Received ${data.length} bytes of data.`);
                this.metricsLogger.info(data);
            }
            
            await this.ns.sleep(MetricsManager.POLL_PERIOD);
        }
    }
}

/**
 * Buffered metric client for reporting metrics to metrics manager.
 * 
 * Since this is buffered, make sure to call `flushMetics()` before the 
 * script ends. Alternatively, wrap/instrument code with `instrument()`.
 * 
 * ```
 * MetricsClient.instrument("myOperation", (report) => {
 *  const sum = 1 + 1;
 *  report({sum: sum});
 * });
 * ```
 */
export class MetricsClient {

    /**
     * Metrics port.
     */
    static PORT = 20;
    
    /**
    * @param {import('../.').NS} ns
    */
    constructor(ns) {
        this.ns = ns;
        this.buffer = {};
    }


    async instrument(operation, instrumentedFunction) {
        if (this.buffer.length !== 0) {
            await this.flushMetrics();
        }
        const bindedReport = (metrics) => this.report(operation, metrics);
        await instrumentedFunction(bindedReport);
        await this.flushMetrics();
    }

    /**
     * @param {string} operation
     * @param {Record<string, string>} metrics
     */
    report(operation, metrics) {
        const bufferedMetric = this.buffer[operation];
        if (bufferedMetric) {
            // Merge items if operation had metrics in buffer.
            Object.entries(metrics).forEach(([key, value]) => {
                if (bufferedMetric[key]) {
                    bufferedMetric[key] += value;
                } else {
                    bufferedMetric[key] = value;
                }
            });
        } else {
            this.buffer[operation] = metrics;
        }
    }

    async flushMetrics() {
        await Object.entries(this.buffer).forEach(async ([operation, metrics]) => {
            const serializedMetrics = Object.entries(metrics)
                .reduce((prevString, [key, value]) => {
                    return prevString + `,${key}=${value}`;
                }, `operation=${operation}`);
            await this.ns.tryWritePort(MetricsClient.PORT, serializedMetrics);
        })
        this.buffer = [];
    }
}

// ====

export async function main(ns) {
    ns.tail();
    const metricsClient = new MetricsClient(ns);

    await metricsClient.instrument("test", (report) => {
        for (let i = 0; i < 100; i++) {
            report({
                iteration: i
            });
            report({
                iteration: i
            });
        }
    });
}

