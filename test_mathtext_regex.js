
const text = "Solve the equation: $x^2 - 4 = 0$";
const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/);

console.log("Original text:", text);
console.log("Parts:", parts);

parts.forEach((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
        console.log(`Part ${index}: BLOCK MATH -> ${part.slice(2, -2)}`);
    } else if (part.startsWith('$') && part.endsWith('$')) {
        console.log(`Part ${index}: INLINE MATH -> ${part.slice(1, -1)}`);
    } else {
        console.log(`Part ${index}: TEXT -> ${part}`);
    }
});

const optionText = "$x = \\pm 2$";
const optionParts = optionText.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/);
console.log("\nOption text:", optionText);
console.log("Option Parts:", optionParts);
