/** @typedef {import("../.").NS} NS*/
    
/** @typedef {string[]} Row */
/** @typedef {Row[]} Rows */
    

/**
 * Transform data for printing into array of rows.
 * @param {any[]} data
 * @return {Rows}
 */
function transformDataToRows(data) {
    const rows = data.map(record => Object.values(record));
    const transformedRows = rows.map(row => row.map(s => s.toString()));
    return transformedRows;
}
    
/**
 * Get the column lengths given the header and rows.
 * @param {Row} header
 * @param {Rows} rows
 */
function getColumnLengths(header, rows) {
    const columnLengths = header.map(s => s.length);
    rows.forEach((row) => {
        row.forEach((value, index) => {
            columnLengths[index] = Math.max(columnLengths[index], value.length)
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
    const rowString = row.reduce((prevString, columnString, index) => {
        const padding = columnLengths[index];
        if (index === 0) {
            return `│ ${columnString.padStart(padding)}`
        } else if (index === row.length - 1) {
            return `${prevString} │ ${columnString.padStart(padding)} │`
        } else {
            return `${prevString} │ ${columnString.padStart(padding)}`
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
 * Pretty print a table to the logs.
 * Header is inferred from first object.
 * @param {NS} ns
 * @param {any[]} data
 */
export function printTable(ns, data) {
    if (data.length === 0) return;

    const header = Object.keys(data[0]);
    const rows = transformDataToRows(data);
    const columnLengths = getColumnLengths(header, rows);

    printTopBorder(ns, columnLengths);
    printRow(ns, header, columnLengths);
    printDivider(ns, columnLengths);
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
}