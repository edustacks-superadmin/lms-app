import * as cheerio from 'cheerio';

export const processPostContent = (htmlContent) => {
    if (!htmlContent) return { content: '', headings: [] };

    const $ = cheerio.load(htmlContent, null, false); // third arg false prevents adding html/body/head tags
    const headings = [];
    const idMap = new Map();

    $('h2, h3').each((_, element) => {
        const el = $(element);
        const text = el.text();
        let id = el.attr('id');

        if (!id) {
            const slug = text.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            id = slug || `heading-${headings.length}`;

            // Ensure unique IDs
            let uniqueId = id;
            let counter = 1;
            while (idMap.has(uniqueId)) {
                uniqueId = `${id}-${counter}`;
                counter++;
            }
            id = uniqueId;
            el.attr('id', id);
        }

        idMap.set(id, true);

        headings.push({
            id,
            text,
            level: element.tagName.toLowerCase()
        });
    });

    // --- MCQ Numbering Fix ---
    // Look for sequential <li> tags that start with MCQ patterns and merge them
    $('lo, ol, ul').each((_, list) => {
        const items = $(list).find('> li');
        let currentQuestion = null;

        items.each((_, item) => {
            const el = $(item);
            const text = el.text().trim();

            // Pattern for MCQ options: (A), (B), (C), (D) or Answer:
            const isOption = /^\(([A-Da-d])\)|^(Answer:)/i.test(text);

            if (isOption && currentQuestion) {
                // Merge this option into the current question li
                const currentHtml = currentQuestion.html();
                const itemHtml = el.html();
                currentQuestion.html(`${currentHtml}<br/>${itemHtml}`);
                // Remove the separate option item
                el.remove();
            } else {
                // Not an option, mark as the potential current question
                currentQuestion = el;
            }
        });
    });

    return {
        content: $.html(),
        headings
    };
};
