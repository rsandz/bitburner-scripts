/** @typedef {import("../.").NS} NS */
import { scanRecursive } from 'lib/discovery';
import { CYCLE_TIME_WEIGHT, GROWTH_WEIGHT, MAX_MONEY_WEIGHT, MIN_SECURITY_WEIGHT, PLAYER_SERVER_PREFIX } from 'lib/constants';

/**
 * Get mean for an array of numbers.
 * @param {number[]} dataArray
 */
export function getMean(dataArray) {
    const sum = dataArray.reduce((prev, curr) => prev + curr, 0);
    return sum / dataArray.length;
}

/**
 * Get standard deviation for an array of numbers.
 * @param {number[]} dataArray
 */
export function getStdDev(dataArray) {
    const mean = getMean(dataArray);
    const variance = dataArray.map(v => Math.pow((v - mean), 2)).reduce((prev, curr) => prev + curr) / dataArray.length;
    return Math.sqrt(variance);
}

/**
 * Get standard deviation for an array of numbers.
 * @param {number[]} dataArray
 */
export function getStandardScore(dataArray) {
    const mean = getMean(dataArray);
    const stdDev = getStdDev(dataArray);
    return dataArray.map(v => (v-mean)/stdDev);
}


/**
 * Get list of servers ranked by desirability to hack.
 * @param {NS} ns
 * @return List of servers where first is most desirable to hack.
 */
export function getServerRankings(ns) {
    const currPlayerHackLevel = ns.getHackingLevel();

    const servers = scanRecursive(ns).filter(name => (
        name.search(PLAYER_SERVER_PREFIX) < 0 && name !== "home"
    ))
    const serversInfo = servers.map(host => {
        const info = ns.getServer(host);
        const hackTime = ns.getHackTime(host);
        const growthTime = ns.getGrowTime(host);
        const weakenTime = ns.getWeakenTime(host);
        const cycleTime = hackTime + growthTime + weakenTime;

        return ({
            hostname: host,
            maxMoney: info.moneyMax,
            minSecurity: info.minDifficulty,
            growth: info.serverGrowth,
            hackLevel: info.requiredHackingSkill,
            cycleTime
        })
    })
    .filter(i => currPlayerHackLevel > i.hackLevel / 3)
    .filter(i => i.maxMoney > 0);
    
    const maxMoneyStandardScores = getStandardScore(serversInfo.map(i => i.maxMoney));
    const minSecurityStandardScores = getStandardScore(serversInfo.map(i => i.minSecurity));
    const growthStandardScores = getStandardScore(serversInfo.map(i => i.growth));
    const cycleTimeStandardScores = getStandardScore(serversInfo.map(i => i.cycleTime));
    
    const scoredServers = serversInfo.map((info, index) => ({
        ...info,
        score: maxMoneyStandardScores[index] * MAX_MONEY_WEIGHT
            + minSecurityStandardScores[index] * MIN_SECURITY_WEIGHT
            + growthStandardScores[index] * GROWTH_WEIGHT
            + cycleTimeStandardScores[index] * CYCLE_TIME_WEIGHT
    }))
    
    return scoredServers.sort((a, b) => b.score - a.score);
}

/**
 * 
 */
function test() {

    const assert = (expected, actual) => {
        let comparator;
        
        if (Array.isArray(expected)) {
            comparator = (expected, actual) => {
                if (!Array.isArray(actual)) return false;
                return expected.every((val, index) => actual[index] === val);
            }
        } else {
            comparator = (expected, actual) => expected === actual;
        }

        if (!comparator(expected, actual)) throw new Error(`${expected} != ${actual}`);
    }
    
    assert(5, getMean([0, 10]));
    assert(1, getMean([1]));
    
    assert(0.5, getStdDev([1,2]));
    assert(0, getStdDev([1,1]));

    assert([-1, 1], getStandardScore([1,2]));
}

export function main(ns) {
    test();
}