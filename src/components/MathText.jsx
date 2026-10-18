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
    // Only wrap sequences of actual words separated by spaces,
    // avoiding backslash commands (like \sum, \implies, \sin, \cos) and already wrapped \text{}
    return latex.replace(/(?<!\\[a-zA-Z]*)\b([a-zA-Z]{2,}\s+[a-zA-Z]{2,}(?:\s+[a-zA-Z]{2,})*)\b/g, (match, words, offset, fullStr) => {
        const preceding = fullStr.slice(0, offset);
        if (/\\text\s*\{[^}]*$/.test(preceding)) {
            return match;
        }
        return `\\text{${match}}`;
    });
}

// Process HTML content and render LaTeX in math-tex spans AND raw LaTeX delimiters
function processHTMLWithLatex(html) {
    if (!html) return '';

    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // 1. Process explicit .math-tex spans
    const mathElements = temp.querySelectorAll('.math-tex');
    mathElements.forEach((el) => {
        const rawContent = el.textContent.trim();
        if (!rawContent) return;

        // If .math-tex contains internal delimiters or mixed text with delimiters,
        // unwrap it so that step 2 parses each math formula and text separately!
        const delimMatches = rawContent.match(/\\\(|\\\[|\$\$|\$/g);
        if (delimMatches && (delimMatches.length > 2 || (delimMatches.length > 0 && !rawContent.startsWith('\\(') && !rawContent.startsWith('\\[')))) {
            const parent = el.parentNode;
            if (parent) {
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
                return;
            }
        }

        let cleanLatex = rawContent
            .replace(/^\\\(/, '')
            .replace(/\\\)$/, '')
            .replace(/^\\\[/, '')
            .replace(/\\\]$/, '')
            .trim();

        cleanLatex = preprocessLatex(cleanLatex);

        const container = document.createElement('span');
        container.className = 'katex-container';

        try {
            katex.render(cleanLatex, container, {
                throwOnError: false,
                displayMode: false,
                output: 'html'
            });
            el.parentNode.replaceChild(container, el);
        } catch (error) {
            console.warn('LaTeX render error for math-tex:', rawContent, error);
        }
    });

    // 2. Walk all remaining text nodes in temp to render any \(...\), \[...\], $$...$$, or $...$
    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
        if (currentNode.parentElement && !currentNode.parentElement.closest('.katex, .katex-container, script, style')) {
            if (/(\\\[|\\\(|\$\$|\$[^$<>\n]+\$)/.test(currentNode.nodeValue)) {
                textNodes.push(currentNode);
            }
        }
    }

    textNodes.forEach((node) => {
        const text = node.nodeValue;
        const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$<>\n]+?\$)/g;
        if (!regex.test(text)) return;

        const fragment = document.createDocumentFragment();
        let lastIdx = 0;
        let match;
        const re = new RegExp(regex);

        while ((match = re.exec(text)) !== null) {
            if (match.index > lastIdx) {
                fragment.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            }

            const rawMatch = match[0];
            let math = '';
            let displayMode = false;

            if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
                math = rawMatch.slice(2, -2);
                displayMode = true;
            } else if (rawMatch.startsWith('\\[') && rawMatch.endsWith('\\]')) {
                math = rawMatch.slice(2, -2);
                displayMode = true;
            } else if (rawMatch.startsWith('\\(') && rawMatch.endsWith('\\)')) {
                math = rawMatch.slice(2, -2);
                displayMode = false;
            } else if (rawMatch.startsWith('$') && rawMatch.endsWith('$') && rawMatch.length > 2) {
                math = rawMatch.slice(1, -1);
                displayMode = false;
            }

            const span = document.createElement('span');
            span.className = 'katex-container';
            try {
                katex.render(preprocessLatex(math.trim()), span, {
                    throwOnError: false,
                    displayMode: displayMode,
                    output: 'html'
                });
                fragment.appendChild(span);
            } catch (err) {
                fragment.appendChild(document.createTextNode(rawMatch));
            }

            lastIdx = re.lastIndex;
        }

        if (lastIdx < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        if (node.parentNode) {
            node.parentNode.replaceChild(fragment, node);
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
