import React, { useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * MathText Component
 * Renders text with LaTeX equations and HTML content.
 * Now supports identifying LaTeX in text nodes within HTML.
 */
const MathText = ({ children }) => {
    const text = String(children || '');
    const hasHTML = /<[^>]+>/.test(text);

    const [content, setContent] = React.useState(hasHTML ? text : null);
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
        if (hasHTML) {
            setContent(processHTMLWithLatex(text));
        }
    }, [text, hasHTML]);

    if (!children) return null;

    if (hasHTML) {
        if (!isClient) {
            return <div dangerouslySetInnerHTML={{ __html: text }} className="inline" />;
        }
        return <div dangerouslySetInnerHTML={{ __html: content }} className="inline" />;
    }

    return <PlainMathContent text={text} />;
};

function cleanLatexString(latex) {
    return latex.trim();
}

// Regex to capture:
// 1. $$...$$ (Display)
// 2. \[...\] (Display)
// 3. \(...\) (Inline)
// 4. $...$ (Inline)
// 5. \text{...} (Explicit command - typically inline)
const MATH_REGEX = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[^$]+?\$|\\text\{[\s\S]+?\})/;

function processHTMLWithLatex(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // 1. Handle explicit .math-tex elements (Legacy support)
    const mathElements = temp.querySelectorAll('.math-tex');
    mathElements.forEach((el) => {
        renderLatexInElement(el, el.textContent.trim());
    });

    // 2. Walk text nodes to find embedded LaTeX
    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
        textNodes.push(node);
    }

    textNodes.forEach((textNode) => {
        const text = textNode.nodeValue;
        if (!text || !MATH_REGEX.test(text)) return;

        const fragment = document.createDocumentFragment();
        const parts = text.split(MATH_REGEX);

        parts.forEach((part) => {
            if (!part) return;

            if (MATH_REGEX.test(part)) {
                // Determine display mode and clean
                let math = part;
                let displayMode = false;

                if (part.startsWith('$$')) {
                    math = part.slice(2, -2);
                    displayMode = true;
                } else if (part.startsWith('\[')) {
                    math = part.slice(2, -2);
                    displayMode = true;
                } else if (part.startsWith('\(')) {
                    math = part.slice(2, -2);
                } else if (part.startsWith('$')) {
                    math = part.slice(1, -1);
                } else if (part.startsWith('\\text{')) {
                    // It's a raw command, pass as is
                    math = part;
                }

                const span = document.createElement('span');
                span.className = 'katex-container';
                try {
                    katex.render(cleanLatexString(math), span, {
                        throwOnError: false,
                        displayMode: displayMode,
                        output: 'html'
                    });
                    fragment.appendChild(span);
                } catch (e) {
                    console.error('KaTeX Error:', e);
                    fragment.appendChild(document.createTextNode(part));
                }
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        if (textNode.parentNode) {
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });

    return temp.innerHTML;
}

function renderLatexInElement(el, latex) {
    if (!latex) return;
    try {
        let cleanLatex = latex
            .replace(/^\\\(/, '')
            .replace(/\\\)$/, '')
            .replace(/^\\\[/, '')
            .replace(/\\\]$/, '')
            .trim();

        cleanLatex = cleanLatexString(cleanLatex);
        const container = document.createElement('span');
        container.className = 'katex-container';

        katex.render(cleanLatex, container, {
            throwOnError: false,
            displayMode: false,
            output: 'html'
        });

        el.parentNode.replaceChild(container, el);
    } catch (error) {
        console.warn('Legacy LaTeX render error:', error);
    }
}


const PlainMathContent = ({ text }) => {
    // Split by the regex
    const parts = text.split(MATH_REGEX);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    return <BlockMath key={index} math={cleanLatexString(part.slice(2, -2))} errorColor={'#cc0000'} />;
                }
                if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    return <BlockMath key={index} math={cleanLatexString(part.slice(2, -2))} errorColor={'#cc0000'} />;
                }
                if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    return <InlineMath key={index} math={cleanLatexString(part.slice(2, -2))} errorColor={'#cc0000'} />;
                }
                if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
                    return <InlineMath key={index} math={cleanLatexString(part.slice(1, -1))} errorColor={'#cc0000'} />;
                }
                if (part.startsWith('\\text{')) {
                    // Determine if it should be block or inline? Default inline for text.
                    // But react-katex InlineMath expects just the content? No, it expects valid LaTeX.
                    // \text{...} is valid LaTeX.
                    return <InlineMath key={index} math={part} errorColor={'#cc0000'} />;
                }

                return <span key={index}>{part}</span>;
            })}
        </>
    );
};

export default MathText;
