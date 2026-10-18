import React from 'react';
import { WebView } from 'react-native-webview';
import { useWindowDimensions } from 'react-native';

const MathWebView = ({ content, style }) => {
    const { width } = useWindowDimensions();

    const mathJaxHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <script type="text/javascript" id="MathJax-script" async
            src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
          </script>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 16px;
              color: #1e293b;
              margin: 0;
              padding: 0;
              overflow-wrap: break-word;
            }
            img { max-width: 100%; height: auto; }
            p { margin: 0 0 10px 0; }
          </style>
        </head>
        <body>
          <div id="content">${content}</div>
          <script>
            // Adjust height automatically
            const resize = () => {
              const height = document.body.scrollHeight;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height }));
            }
            window.addEventListener('load', resize);
            window.addEventListener('resize', resize);
            // Polling backup
            setInterval(resize, 1000);
          </script>
        </body>
      </html>
    `;

    const [height, setHeight] = React.useState(100);

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'height') {
                setHeight(data.height);
            }
        } catch (e) { }
    };

    return (
        <WebView
            source={{ html: mathJaxHtml }}
            onMessage={onMessage}
            style={[{ width: '100%', height, backgroundColor: 'transparent' }, style]}
            scrollEnabled={false}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
        />
    );
};

export default MathWebView;
