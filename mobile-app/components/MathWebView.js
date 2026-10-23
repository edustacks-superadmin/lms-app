import React, { useState, useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { View } from 'react-native';

const MathWebView = ({ content, style }) => {
    const minHeight = style?.minHeight || 30;
    const [height, setHeight] = useState(minHeight);

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'height' && typeof data.height === 'number') {
                setHeight(Math.max(data.height, minHeight));
            }
        } catch (e) { }
    };

    const katexHtml = useMemo(() => {
        const safeContent = content || '';
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          
          <!-- KaTeX CSS -->
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
          
          <!-- KaTeX JS & Auto-render extension -->
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>

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
              line-height: 1.55;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            #content {
              width: 100%;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
            }
            p {
              margin: 0 0 8px 0;
            }
            p:last-child {
              margin-bottom: 0;
            }

            /* === KaTeX Automatic Line-Wrapping === */
            .katex-display {
              display: block !important;
              margin: 0.6em 0 !important;
              text-align: center !important;
              max-width: 100% !important;
              white-space: normal !important;
              overflow-x: auto !important;
              overflow-y: hidden !important;
              -webkit-overflow-scrolling: touch;
            }

            .katex-display > .katex {
              display: inline-block !important;
              white-space: normal !important;
              text-align: initial !important;
              max-width: 100% !important;
            }

            .katex-display > .katex > .katex-html {
              display: inline !important;
              white-space: normal !important;
              max-width: 100% !important;
              word-wrap: break-word !important;
            }

            .katex {
              font-size: 1.05em;
              white-space: normal !important;
              text-rendering: auto;
            }

            .katex-html {
              white-space: normal !important;
            }

            /* Allow KaTeX operator and relation segments to break onto new lines */
            .katex .base {
              display: inline-block !important;
              white-space: normal !important;
              margin-top: 2px !important;
              margin-bottom: 2px !important;
            }

            .katex .mbin,
            .katex .mrel,
            .katex .mpunct {
              white-space: normal !important;
            }

            /* Scrollbar for irreducible elements like wide matrices */
            .katex-display::-webkit-scrollbar {
              height: 2px;
            }
            .katex-display::-webkit-scrollbar-thumb {
              background-color: rgba(0, 0, 0, 0.15);
              border-radius: 2px;
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

              postHeight();
            }

            function postHeight() {
              var content = document.getElementById('content');
              var h = Math.max(
                document.body.scrollHeight || 0,
                document.documentElement.scrollHeight || 0,
                content ? content.offsetHeight : 0
              );
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: h + 4 }));
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
                scrollEnabled={false}
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
