import { Color, withColor } from "lib/print";

/** @typedef {import("../.").NS} NS*/
    
/**
 * @typedef StyledCell 
 * @prop {Color} color
 * @prop {any} value
 */
/** @typedef {string|StyledCell} Cell */
/** @typedef {Cell[]} Row */
/** @typedef {Row[]} Rows */
    

/**
 * Transform data for printing into array of rows.
 * @param {any[]} data
 * @return {Rows}
 */
function transformDataToRows(data) {
    const rows = data.map(record => Object.values(record));
    return rows;
}

/**
 * @param {Cell} cell
 */
function getCellValue(cell) {
    if (typeof cell === "object" && cell.value) {
        return cell.value;
    } else {
        return cell.toString();
    }
}

/**
 * @param {Cell} cell
 */
function getCellColor(cell) {
    if (typeof cell === "object" && cell.color) {
        return cell.color;
    } else {
        return null;
    }
}
    
/**
 * Get the column lengths given the header and rows.
 * @param {Row} header
 * @param {Rows} rows
 */
function getColumnLengths(header, rows) {
    const columnLengths = header.map(s => s.length);
    rows.forEach((row) => {
        row.forEach((cell, index) => {
            const cellValue = getCellValue(cell);
            columnLengths[index] = Math.max(columnLengths[index], cellValue.length);
        });
    });
    return columnLengths;
}

/**
 * Prints a row to logs.
 * @param {NS} ns
 * @param {Row} row
 * @param {number[]} columnLengths
 */
function printRow(ns, row, columnLengths) {
    const rowString = row.reduce((prevString, cell, index) => {
        const padding = columnLengths[index];
        const cellValue = getCellValue(cell);
        const cellColor = getCellColor(cell);

        let printString = cellValue.padStart(padding);
        if (cellColor) {
            printString = withColor(printString, cellColor);
        }

        if (index === 0) {
            return `│ ${printString}`
        } else if (index === row.length - 1) {
            return `${prevString} │ ${printString} │`
        } else {
            return `${prevString} │ ${printString}`
        }
    }, "");
    ns.print(rowString);
}

/**
 * Prints divider after header.
 * @param {NS} ns
 * @param {number[]} columnLengths
 */
function printDivider(ns, columnLengths) {
    const dividerString = columnLengths.reduce((prevString, currentLength, index) => {
        if (index === 0) {
            return `├─${'─'.repeat(currentLength)}`;
        } else if (index === columnLengths.length - 1) {
            return `${prevString}─┼─${'─'.repeat(currentLength)}─┤`;
        } else {
            return `${prevString}─┼─${'─'.repeat(currentLength)}`;
        }
    }, "");
    ns.print(dividerString);
}

function printTopBorder(ns, columnLengths) {
    const borderString = columnLengths.reduce((prevString, currentLength, index) => {
        if (index === 0) {
            return `┌─${'─'.repeat(currentLength)}`;
        } else if (index === columnLengths.length - 1) {
            return `${prevString}─┬─${'─'.repeat(currentLength)}─┐`;
        } else {
            return `${prevString}─┬─${'─'.repeat(currentLength)}`;
        }
    }, "");
    ns.print(borderString);
}

function printBottomBorder(ns, columnLengths) {
    const borderString = columnLengths.reduce((prevString, currentLength, index) => {
        if (index === 0) {
            return `└─${'─'.repeat(currentLength)}`;
        } else if (index === columnLengths.length - 1) {
            return `${prevString}─┴─${'─'.repeat(currentLength)}─┘`;
        } else {
            return `${prevString}─┴─${'─'.repeat(currentLength)}`;
        }
    }, "");
    ns.print(borderString);
}

/**
 * @typedef Options
 * @prop {boolean} showHeader
 */
    
/** @type {Options} */
const DEFAULT_OPTIONS = {
    showHeader: true
}

/**
 * Pretty print a table to the logs.
 * Header is inferred from first object.
 * @param {NS} ns
 * @param {any[]} data
 * @param {Options?} options
 */
export function printTable(ns, data, options = DEFAULT_OPTIONS) {
    if (data.length === 0) return;

    const header = Object.keys(data[0]);
    const rows = transformDataToRows(data);
    const columnLengths = getColumnLengths(header, rows);

    printTopBorder(ns, columnLengths);
    
    if (options?.showHeader) {
        printRow(ns, header, columnLengths);
        printDivider(ns, columnLengths);
    }

    rows.forEach(row => {
        printRow(ns, row, columnLengths);
    });
    printBottomBorder(ns, columnLengths);
}

/**
 * @param {NS} ns
 */
export function main(ns) {
    const data =  [
        {
            header1: "testtest",
            header2: "123456789",
            header3: "a"
        },
        {
            header1: "testtest",
            header2: "987654321",
            header3: "ab"
        },
        {
            header1: "testtest",
            header2: "123456789",
            header3: "abc"
        }
    ]
    
    ns.tail();
    printTable(ns, data);
    
    const data2 = [        
        {
            label: "money",
            value: {
                color: Color.Red,
                value: "$1001"
            }
        },
        {
            label: "Some Value",
            value: "Banana"
        },
    ]
    printTable(ns, data2, {showHeader: false});
}