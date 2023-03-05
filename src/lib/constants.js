
export const PLAYER_SERVER_PREFIX = "pserv";

export const HACK_TARGETS_LIST = 'targetList.txt';

// Thresholds for fixing drift
export const SECURITY_DRIFT_THRESHOLD = 1.5;
export const MONEY_DRIFT_THRESHOLD = 0.5;

// Server Ranking Config
export const MAX_MONEY_WEIGHT = 1.5;
export const MIN_SECURITY_WEIGHT = -1.0;
export const GROWTH_WEIGHT = 1.5;
export const CYCLE_TIME_WEIGHT = -1.8;

// SCP Scripts
export const WEAKEN_SCRIPT = '/lib/weaken.js';
export const GROW_SCRIPT = '/lib/grow.js';
export const HACK_SCRIPT = '/lib/hack.js';
export const SUPPORT_LIBS = [
    "/lib/metrics.js",
    "/lib/publishing.js",
    "/lib/log.js",
    "/lib/constants.js"
];


export const Ports = {
    PUBLISHING: 10,
    METRICS: 20
}

export const EMPTY_PORT_VALUE = "NULL PORT DATA";