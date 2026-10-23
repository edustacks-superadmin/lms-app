import React, { useState, useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { View } from 'react-native';

const MathWebView = ({ content, style, onScrollStatusChange, onOptionPress }) => {
    const minHeight = style?.minHeight || 20;
    const [height, setHeight] = useState(minHeight);

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'height' && typeof data.height === 'number') {
                setHeight(Math.max(data.height, minHeight));
            } else if (data.type === 'mathScroll' && typeof data.active === 'boolean') {
                if (onScrollStatusChange) {
                    onScrollStatusChange(data.active);
                }
            } else if (data.type === 'tap') {
                if (onOptionPress) {
                    onOptionPress();
                }
            }
        } catch (e) { }
    };

    const katexHtml = useMemo(() => {
        let safeContent = content || '';

        // 1. Move trailing punctuation into the math expression so it never wraps to a separate line alone
        safeContent = safeContent.replace(/\\\(([\s\S]*?)\\\)\s*([.,;:!?])/g, (match, formula, punct) => {
            return `\\(${formula.trim()}\\text{${punct}}\\)`;
        });
        safeContent = safeContent.replace(/\\\[([\s\S]*?)\\\]\s*([.,;:!?])/g, (match, formula, punct) => {
            return `\\[${formula.trim()}\\text{${punct}}\\]`;
        });
        safeContent = safeContent.replace(/\$\$([\s\S]*?)\$\$\s*([.,;:!?])/g, (match, formula, punct) => {
            return `$$${formula.trim()}\\text{${punct}}$$`;
        });

        // 2. Promote standalone paragraph formulas (<p>\( ... \)</p> or <div>\( ... \)</div>)
        // to display equations (\[ ... \]) so they get proper block display and dedicated horizontal scrolling.
        safeContent = safeContent.replace(/<p(\s*[^>]*)>\s*\\\(([\s\S]*?)\\\)\s*<\/p>/gi, (match, attrs, formula) => {
            return `<p${attrs}>\\[ ${formula.trim()} \\]</p>`;
        });
        safeContent = safeContent.replace(/<div(\s*[^>]*)>\s*\\\(([\s\S]*?)\\\)\s*<\/div>/gi, (match, attrs, formula) => {
            return `<div${attrs}>\\[ ${formula.trim()} \\]</div>`;
        });

        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          
          <!-- KaTeX CSS -->
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
          
          <!-- KaTeX JS & Auto-render extension -->
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/auto-render.min.js" crossorigin="anonymous"></script>

          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: transparent;
              color: #1e293b;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 15px;
              line-height: 1.45;
              word-wrap: break-word;
              overflow-wrap: break-word;
              overflow-x: hidden;
            }
            #content {
              width: 100%;
              max-width: 100%;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
            }
            p {
              margin: 0 0 6px 0;
              max-width: 100%;
            }
            p:last-child {
              margin-bottom: 0 !important;
            }
            p:empty {
              display: none !important;
            }

            /* === KaTeX Equations & Automatic Line-Wrapping === */
            .katex {
              font-size: 1.05em;
              text-rendering: auto;
              white-space: normal !important;
              max-width: 100% !important;
            }

            .katex-html {
              white-space: normal !important;
              display: inline !important;
              max-width: 100% !important;
            }

            /* Allow mathematical parts/bases (terms between =, +, -) to wrap gracefully */
            .katex-html > .base, .katex .base {
              white-space: nowrap !important;
              display: inline-block !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              margin-top: 1.5px;
              margin-bottom: 1.5px;
            }

            /* Display equations (block formulas): smooth horizontal scroll with visible indicator */
            .katex-display {
              display: block !important;
              margin: 0.75em 0 !important;
              text-align: center !important;
              max-width: 100% !important;
              overflow-x: auto !important;
              overflow-y: hidden !important;
              -webkit-overflow-scrolling: touch !important;
              padding: 4px 0 !important;
              touch-action: pan-x !important;
              scrollbar-width: thin;
              scrollbar-color: rgba(37, 99, 235, 0.45) transparent;
            }

            .katex-display > .katex {
              display: inline-block !important;
              text-align: center !important;
              white-space: nowrap !important;
            }

            .katex-display > .katex > .katex-html {
              display: inline-block !important;
              white-space: nowrap !important;
            }

            /* Scrollable wrapper for equations/formulas when they exceed container width */
            .katex-scroll-wrapper {
              display: inline-block !important;
              max-width: 100% !important;
              overflow-x: auto !important;
              overflow-y: hidden !important;
              -webkit-overflow-scrolling: touch !important;
              vertical-align: middle !important;
              touch-action: pan-x !important;
              scrollbar-width: thin;
              scrollbar-color: rgba(37, 99, 235, 0.45) transparent;
              padding: 2px 2px !important;
              box-sizing: border-box !important;
            }

            .katex-scroll-wrapper > .katex {
              display: inline-block !important;
              white-space: normal !important;
            }

            /* Clean, visible horizontal scrollbars when equations overflow */
            .katex-display::-webkit-scrollbar,
            .katex-scroll-wrapper::-webkit-scrollbar {
              height: 3px !important;
            }
            .katex-display::-webkit-scrollbar-track,
            .katex-scroll-wrapper::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.04) !important;
              border-radius: 3px !important;
            }
            .katex-display::-webkit-scrollbar-thumb,
            .katex-scroll-wrapper::-webkit-scrollbar-thumb {
              background-color: rgba(37, 99, 235, 0.45) !important;
              border-radius: 3px !important;
            }
          </style>
        </head>
        <body>
          <div id="content">${safeContent}</div>
          <script>
            function renderKaTeX() {
              if (typeof renderMathInElement !== 'function') {
                setTimeout(renderKaTeX, 30);
                return;
              }

              // Ensure .math-tex spans with raw formulas have delimiters
              try {
                var spans = document.querySelectorAll('.math-tex');
                for (var i = 0; i < spans.length; i++) {
                  var s = spans[i];
                  var t = s.textContent || '';
                  if (t && t.indexOf('\\(') === -1 && t.indexOf('\\[') === -1 && t.indexOf('$') === -1) {
                    s.textContent = '\\(' + t + '\\)';
                  }
                }
              } catch (e) {}

              renderMathInElement(document.getElementById('content'), {
                delimiters: [
                  { left: '$$', right: '$$', display: true },
                  { left: '\\\\[', right: '\\\\]', display: true },
                  { left: '\\\\(', right: '\\\\)', display: false },
                  { left: '$', right: '$', display: false }
                ],
                throwOnError: false,
                strict: false
              });

              // Prevent orphan punctuation (. , : ; ! ?) from dropping onto a separate line alone after any math
              try {
                var katexSpans = document.querySelectorAll('.katex');
                for (var j = 0; j < katexSpans.length; j++) {
                  var k = katexSpans[j];
                  if (k.nextSibling && k.nextSibling.nodeType === 3) {
                    var m = k.nextSibling.nodeValue.match(/^([.,;:!?])(\s*)/);
                    if (m) {
                      var wrapper = document.createElement('span');
                      wrapper.style.whiteSpace = 'nowrap';
                      wrapper.style.display = 'inline-block';
                      k.parentNode.insertBefore(wrapper, k);
                      wrapper.appendChild(k);
                      var punctNode = document.createTextNode(m[1]);
                      wrapper.appendChild(punctNode);
                      k.nextSibling.nodeValue = k.nextSibling.nodeValue.substring(m[0].length);
                    }
                  }
                }
              } catch (e) {}

              // Wrap only formulas that actually overflow container width in a scrollable wrapper
              try {
                var contentEl = document.getElementById('content');
                var cWidth = contentEl ? contentEl.clientWidth : 300;
                var allKatex = document.querySelectorAll('.katex');
                for (var kIdx = 0; kIdx < allKatex.length; kIdx++) {
                  var itemKatex = allKatex[kIdx];
                  if (itemKatex.closest && itemKatex.closest('.katex-display')) continue;
                  if (itemKatex.closest && itemKatex.closest('.katex-scroll-wrapper')) continue;

                  // If formula still exceeds container width, allow horizontal scrolling
                  if (itemKatex.scrollWidth > cWidth + 2) {
                    var scrollWrap = document.createElement('span');
                    scrollWrap.className = 'katex-scroll-wrapper';
                    itemKatex.parentNode.insertBefore(scrollWrap, itemKatex);
                    scrollWrap.appendChild(itemKatex);
                  }
                }
              } catch (e) {}

              postHeight();
            }

            function postHeight() {
              var content = document.getElementById('content');
              var h = 0;
              if (content) {
                var rect = content.getBoundingClientRect();
                h = Math.ceil(rect.height);
              }
              if (!h) {
                h = Math.max(
                  document.body.scrollHeight || 0,
                  document.documentElement.scrollHeight || 0
                );
              }
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: h + 6 }));
              }
            }

            window.addEventListener('load', function() {
              renderKaTeX();
              postHeight();
            });

            if (window.ResizeObserver) {
              var ro = new ResizeObserver(function() {
                postHeight();
              });
              ro.observe(document.body);
            }

            setTimeout(postHeight, 100);
            setTimeout(postHeight, 300);
            setTimeout(postHeight, 800);

            // Handle touch detection for scrollable equations to prevent parent FlatList paging
            function findScrollableParent(target) {
              while (target && target !== document.body && target !== document.documentElement) {
                if (target.scrollWidth > target.clientWidth + 2) {
                  return target;
                }
                target = target.parentElement;
              }
              return null;
            }

            var activeScrollElement = null;
            var touchStartX = 0;
            var touchStartY = 0;
            var touchStartTime = 0;
            var isTouchMoved = false;

            document.addEventListener('touchstart', function(e) {
              if (e.touches && e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
                isTouchMoved = false;
              }
              activeScrollElement = findScrollableParent(e.target);
              if (activeScrollElement && window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mathScroll', active: true }));
              }
            }, { passive: true });

            document.addEventListener('touchmove', function(e) {
              if (e.touches && e.touches.length === 1) {
                var dx = Math.abs(e.touches[0].clientX - touchStartX);
                var dy = Math.abs(e.touches[0].clientY - touchStartY);
                if (dx > 8 || dy > 8) {
                  isTouchMoved = true;
                }
              }
            }, { passive: true });

            document.addEventListener('touchend', function(e) {
              var duration = Date.now() - touchStartTime;
              // If user tapped without dragging, notify React Native to handle selection/double-tap
              if (!isTouchMoved && duration < 350) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap' }));
                }
              }
              if (activeScrollElement) {
                activeScrollElement = null;
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mathScroll', active: false }));
                }
              }
            }, { passive: true });

            document.addEventListener('touchcancel', function() {
              isTouchMoved = false;
              if (activeScrollElement) {
                activeScrollElement = null;
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mathScroll', active: false }));
                }
              }
            }, { passive: true });
          </script>
        </body>
      </html>
    `;
    }, [content]);

    return (
        <View style={{ width: '100%', overflow: 'hidden' }}>
            <WebView
                source={{ html: katexHtml }}
                onMessage={onMessage}
                style={[{ width: '100%', height, backgroundColor: 'transparent' }, style]}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                androidLayerType="hardware"
            />
        </View>
    );
};

export default MathWebView;
