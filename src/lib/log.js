
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    ERROR: 2
}

/**
 * Logging Utility Class.
 */
export class Logger {

    /**
     * @param {import('../.').NS} ns
     * @param {LogHandler[]} handlers
     * @param {LogFormatter[]} formatters
     */
    constructor(ns, handlers = [], formatters = []) {
        this.ns = ns;
        this.level = LogLevel.INFO;

        /**
         * @type {LogHandler[]}
         */
        this.handlers = handlers;

        /**
         * @type {LogFormatter[]}
         */
        this.formatter = formatters;
    }

    /**
     * Create a logger with default settings.
     * @return {Logger}
     */
    static withDefaultConfig(ns) {
        return new Logger(
            ns,
            [new ScriptLogHandler(ns)],
            [new StandardFormatter(ns)]
        );
    }

    /**
     * Set logging level
     * @param {LogLevel} level
     */
    setLevel(level) {
        this.level = level;
    }

    /**
     * Log a message with a given severity level.
     * @param {LogLevel} logLevel
     * @param {string} msg
     * @param {Record<string, any>} props
     */
    log(logLevel, msg, props) {
        if (logLevel < this.level) {
            return;
        }

        const formattedMsg = this.formatter.reduce(
            (prevMsg, formatter) => formatter.format(prevMsg, {
                logLevel: logLevel,
                ...props
            }), msg);

        this.handlers.forEach((handler) => {
            handler.handle(formattedMsg, {
                logLevel: logLevel,
                ...props
            });
        });
    }

    debug(msg) {
        this.log(LogLevel.DEBUG, msg);
    }

    info(msg) {
        this.log(LogLevel.INFO, msg);
    }

    error(msg) {
        this.log(LogLevel.ERROR, msg);
    }
}

/**
 * Sends a log message to the correct destination.
 */
export class LogHandler {

    /**
     * @param {import('../.').NS} ns
     */
    constructor(ns) {
        this.ns = ns;
    }

    /**
     * @param {string} msg
     */
    handle(msg, props) {};
}

export class ScriptLogHandler extends LogHandler {
    /**
     * @param {import('../.').NS} ns
     */
    constructor(ns) {
        super(ns);
    }

    handle(msg, props) {
        this.ns.print(msg);
    }
}

export class FileHandler extends LogHandler {

    static MAX_FILE_SIZE = 500000;

    /**
     * @param {import('../.').NS} ns
     */
    constructor(ns, baseFilename) {
        super(ns);
        this.baseFilename = baseFilename;
        this.logPathA = `/logs/${baseFilename}-A.txt`;
        this.logPathB = `/logs/${baseFilename}-B.txt`;

        const logPathASize = this.getLogFileNumberOfLines(this.logPathA);
        const logPathBSize = this.getLogFileNumberOfLines(this.logPathB);

        if (logPathASize < FileHandler.MAX_FILE_SIZE) {
            this.currentFile = this.logPathA;
            this.currentFileSize = logPathASize;
        } else if (logPathBSize < FileHandler.MAX_FILE_SIZE) {
            this.currentFile = this.logPathA;
            this.currentFileSize = logPathBSize;
        } else {
            this.currentFile = this.logPathA;
            this.rotateLogFiles();
        }
    }

    getLogFileNumberOfLines(path) {
        return this.ns.read(path).length;
    }

    rotateLogFiles() {
        this.ns.print("ROTATE");
        if (this.currentFile === this.logPathA) {
            this.currentFile = this.logPathB;
            this.currentFileSize = 0;
            this.ns.write(this.logPathB, "", "w");
        } else if (this.currentFile === this.logPathB) {
            this.currentFile = this.logPathA;
            this.currentFileSize = 0;
            this.ns.write(this.logPathA, "", "w");
        } else {
            throw new Error(`Unknown log file ${this.currentFile} was being used.`);
        }
    }

    handle(msg, _) {
        this.ns.write(this.currentFile, msg + "\n", "a");
        this.currentFileSize += msg.length;
        if (this.currentFileSize >= FileHandler.MAX_FILE_SIZE) {
            this.rotateLogFiles();
        }
    }
}

// ==============================

/**
 * Formats a log message before emitting it.
 */
export class LogFormatter {
    /**
     * @param {import('../.').NS} ns
     */
    constructor(ns) {
        this.ns = ns;
    }

    /**
     * @param {string} msg
     * @param {object} props
     * @return {string}
     */
    format(msg, props) {};
}

export class StandardFormatter extends LogFormatter {
    /**
     * @param {import('../.').NS} ns
     */
    constructor(ns) {
        super(ns);
    }

    format(msg, props) {
        let level = "UNKNOWN";
        for (const [key, value] of Object.entries(LogLevel)) {
            if (value === props?.logLevel) {
                level = key;
            }
        }
        const now = new Date();
        const date = `${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        return `[${level}] ${date}: ${msg}`;
    }
}

// ===== 

export function main(ns) {
    ns.tail();
    const logger = new Logger(ns, [new FileHandler(ns, "test")]);
    for (let i = 0; i < 2000; i++) {
        logger.info("HELLO " + i);
    }
}