/** @typedef {import('../.').NS} NS*/
    
const Color = {
    White: "\u001b[38;5;250m",
    Blue: "\u001b[38;5;116m",
    Green: "\u001b[38;5;78m",
    Yellow: "\u001b[38;5;185m",
    Red: "\u001b[38;5;203m",
    Reset: "\u001b[0m"
};

/**
 * Adds color to text.
 * @param {string} text
 * @param {Color} color
 */
export function withColor(text, color) {
    return `${color}${text}${color.Reset}`;
}