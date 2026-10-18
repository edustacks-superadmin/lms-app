import React, { useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * MathText Component
 * Renders text with LaTeX equations and HTML content
 */
const MathText = ({ children }) => {
    if (!children) return null;

    const text = String(children);

    // Check if content contains HTML tags
    const hasHTML = /<[^>]+>/.test(text);

    if (hasHTML) {
        // Process HTML with LaTeX synchronously
        const processedHTML = useMemo(() => processHTMLWithLatex(text), [text]);
        return <div dangerouslySetInnerHTML={{ __html: processedHTML }} style={{ display: 'inline' }} />;
    }

    return <PlainMathContent text={text} />;
};

// Preprocess LaTeX to preserve spaces in text
function preprocessLatex(latex) {
    // Pattern to find text with spaces (not single variables)
    // Matches words with spaces like "Lateral strain", "longitudinal strain", etc.
    return latex.replace(/([a-zA-Z]+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*)/g, (match) => {
        // Don't wrap if already in a text command
        return `\\text{${match}}`;
    });
}

// Process HTML content and render LaTeX in math-tex spans
function processHTMLWithLatex(html) {
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Find all math-tex spans
    const mathElements = temp.querySelectorAll('.math-tex');

    mathElements.forEach((el) => {
        const latex = el.textContent.trim();
        if (!latex) return;

        try {
            // Remove LaTeX delimiters
            let cleanLatex = latex
                .replace(/^\\\(/, '')
                .replace(/\\\)$/, '')
                .replace(/^\\\[/, '')
                .replace(/\\\]$/, '')
                .trim();

            // Preprocess to add \text{} around multi-word text
            cleanLatex = preprocessLatex(cleanLatex);

            // Create a container for the rendered LaTeX
            const container = document.createElement('span');
            container.className = 'katex-container';

            // Render using katex
            katex.render(cleanLatex, container, {
                throwOnError: false,
                displayMode: false,
                output: 'html'
            });

            // Replace the math-tex element with the rendered content
            el.parentNode.replaceChild(container, el);
        } catch (error) {
            console.error('LaTeX render error for:', latex, error);
            el.style.color = 'red';
            el.textContent = '[LaTeX Error]';
        }
    });

    return temp.innerHTML;
}

// Component to render plain text with LaTeX delimiters
const PlainMathContent = ({ text }) => {
    // Split by multiple LaTeX delimiters
    const parts = text.split(/(\\$\\$[\\s\\S]+?\\$\\$|\\\\\\[[\\s\\S]+?\\\\\\]|\\$[^$]+?\\$|\\\\\\([\\s\\S]+?\\\\\\))/);

    return (
        <>
            {parts.map((part, index) => {
                // Block math with $$...$$
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = preprocessLatex(part.slice(2, -2));
                    try {
                        return <BlockMath key={index} math={math} />;
                    } catch (error) {
                        return <span key={index} style={{ color: 'red' }}>[Invalid LaTeX]</span>;
                    }
                }

                // Block math with \[...\]
                if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = preprocessLatex(part.slice(2, -2));
                    try {
                        return <BlockMath key={index} math={math} />;
                    } catch (error) {
                        return <span key={index} style={{ color: 'red' }}>[Invalid LaTeX]</span>;
                    }
                }

                // Inline math with \(...\)
                if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    const math = preprocessLatex(part.slice(2, -2));
                    try {
                        return <InlineMath key={index} math={math} />;
                    } catch (error) {
                        return <span key={index} style={{ color: 'red' }}>[Invalid LaTeX]</span>;
                    }
                }

                // Inline math with $...$
                if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
                    const math = preprocessLatex(part.slice(1, -1));
                    try {
                        return <InlineMath key={index} math={math} />;
                    } catch (error) {
                        return <span key={index} style={{ color: 'red' }}>[Invalid LaTeX]</span>;
                    }
                }

                // Regular text
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};

export default MathText;
