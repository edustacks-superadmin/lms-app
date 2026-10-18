import { utils, write } from 'xlsx';

/**
 * Generate Excel template for bulk question upload
 * Returns a Blob that can be downloaded
 */
export const generateQuestionTemplate = () => {
    // Sample data with LaTeX examples
    const sampleData = [
        {
            'Question': 'Solve the equation: $x^2 - 4 = 0$',
            'Option A': '$x = \\pm 2$',
            'Option B': '$x = 2$',
            'Option C': '$x = -2$',
            'Option D': '$x = 4$',
            'Correct': 'A',
            'Explanation': 'Factor as $(x-2)(x+2) = 0$',
            'Marks': 2,
            'Difficulty': 'medium'
        },
        {
            'Question': 'What is the value of $\\sqrt{25}$?',
            'Option A': '5',
            'Option B': '25',
            'Option C': '$\\pm 5$',
            'Option D': '2.5',
            'Correct': 'A',
            'Explanation': 'Square root of 25 is 5',
            'Marks': 1,
            'Difficulty': 'easy'
        },
        {
            'Question': 'Evaluate: $\\int x^2 dx$',
            'Option A': '$\\frac{x^3}{3} + C$',
            'Option B': '$2x + C$',
            'Option C': '$x^3 + C$',
            'Option D': '$\\frac{x^2}{2} + C$',
            'Correct': 'A',
            'Explanation': 'Power rule: $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$',
            'Marks': 3,
            'Difficulty': 'hard'
        },
        {
            'Question': 'If $f(x) = 2x + 3$, find $f(5)$',
            'Option A': '10',
            'Option B': '11',
            'Option C': '13',
            'Option D': '8',
            'Correct': 'C',
            'Explanation': '$f(5) = 2(5) + 3 = 10 + 3 = 13$',
            'Marks': 1,
            'Difficulty': 'easy'
        },
        {
            'Question': 'The area of a circle is $A = \\pi r^2$. If $r = 3$, find $A$ (use $\\pi \\approx 3.14$)',
            'Option A': '9.42',
            'Option B': '18.84',
            'Option C': '28.26',
            'Option D': '37.68',
            'Correct': 'C',
            'Explanation': '$A = \\pi \\times 3^2 = 3.14 \\times 9 = 28.26$',
            'Marks': 2,
            'Difficulty': 'medium',
            'Subject': 'Math'
        }
    ];

    // Instructions data
    const instructions = [
        { 'Instructions': 'HOW TO USE THIS TEMPLATE' },
        { 'Instructions': '' },
        { 'Instructions': '1. Fill in the questions starting from row 2 in the "Questions" sheet' },
        { 'Instructions': '2. For mathematical equations, use LaTeX syntax between dollar signs' },
        { 'Instructions': '   - Inline math: $x^2 + y^2 = r^2$' },
        { 'Instructions': '   - Block math: $$\\int_a^b f(x)dx$$' },
        { 'Instructions': '' },
        { 'Instructions': '3. Column Details:' },
        { 'Instructions': '   - Question: The question text (required)' },
        { 'Instructions': '   - Option A/B/C/D: Answer choices (at least 2 required)' },
        { 'Instructions': '   - Correct: Letter of correct answer (A, B, C, or D)' },
        { 'Instructions': '   - Explanation: Explanation shown after answer (optional)' },
        { 'Instructions': '   - Marks: Points for correct answer (default: 1)' },
        { 'Instructions': '   - Difficulty: easy, medium, or hard (default: medium)' },
        { 'Instructions': '' },
        { 'Instructions': '4. Leave Option C and D blank for True/False questions' },
        { 'Instructions': '' },
        { 'Instructions': 'LATEX QUICK REFERENCE' },
        { 'Instructions': '' },
        { 'Instructions': 'Common Symbols:' },
        { 'Instructions': '  Fractions: \\frac{numerator}{denominator}' },
        { 'Instructions': '  Square root: \\sqrt{x}' },
        { 'Instructions': '  Powers/Superscript: x^2 or x^{10}' },
        { 'Instructions': '  Subscript: x_1 or x_{sub}' },
        { 'Instructions': '  Plus-minus: \\pm' },
        { 'Instructions': '' },
        { 'Instructions': 'Greek Letters:' },
        { 'Instructions': '  \\alpha, \\beta, \\gamma, \\delta, \\pi, \\theta, \\lambda, \\mu, \\sigma' },
        { 'Instructions': '' },
        { 'Instructions': 'Calculus:' },
        { 'Instructions': '  Sum: \\sum_{i=1}^{n} x_i' },
        { 'Instructions': '  Integral: \\int_a^b f(x)dx' },
        { 'Instructions': '  Limit: \\lim_{x \\to \\infty} f(x)' },
        { 'Instructions': '  Derivative: \\frac{dy}{dx}' },
        { 'Instructions': '' },
        { 'Instructions': 'Comparison:' },
        { 'Instructions': '  Less than: <' },
        { 'Instructions': '  Greater than: >' },
        { 'Instructions': '  Less/equal: \\leq' },
        { 'Instructions': '  Greater/equal: \\geq' },
        { 'Instructions': '  Not equal: \\neq' },
        { 'Instructions': '  Approximately: \\approx' },
        { 'Instructions': '' },
        { 'Instructions': 'For more LaTeX symbols, visit: https://katex.org/docs/supported.html' }
    ];

    // Create workbook
    const wb = utils.book_new();

    // Add Questions sheet
    const ws1 = utils.json_to_sheet(sampleData);
    utils.book_append_sheet(wb, ws1, 'Questions');

    // Add Instructions sheet
    const ws2 = utils.json_to_sheet(instructions);
    utils.book_append_sheet(wb, ws2, 'Instructions');

    // Generate file
    const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    return blob;
};

/**
 * Download the template file
 */
export const downloadTemplate = () => {
    const blob = generateQuestionTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MCQ_Upload_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
