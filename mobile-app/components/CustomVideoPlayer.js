import React, { forwardRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { ORG_CONFIG } from '../config/organization';

const CustomVideoPlayer = forwardRef(({ source, style, ...props }, ref) => {
    const videoUrl = typeof source === 'string' ? source : source?.uri;

    if (!videoUrl) {
        return (
            <View style={[styles.container, style, styles.center]}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');

    let htmlContent;

    if (isYouTube) {
        // Extract YouTube ID
        let videoId = '';
        if (videoUrl.includes('youtu.be')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('v=')) {
            videoId = videoUrl.split('v=')[1].split('&')[0];
        } else if (videoUrl.includes('embed/')) {
            videoId = videoUrl.split('embed/')[1].split('?')[0];
        }

        htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    body { margin: 0; background-color: black; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
                    iframe { width: 100%; height: 100%; border: none; }
                </style>
            </head>
            <body>
                <div id="player"></div>
                <script>
                    var tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    var firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                    var player;
                    function onYouTubeIframeAPIReady() {
                        player = new YT.Player('player', {
                            height: '100%',
                            width: '100%',
                            videoId: '${videoId}',
                            events: {
                                'onReady': onPlayerReady,
                                'onStateChange': onPlayerStateChange
                            },
                            playerVars: {
                                'playsinline': 1,
                                'autoplay': 0,
                                'controls': 1,
                                'rel': 0,
                                'modestbranding': 1,
                                'origin': '${ORG_CONFIG.webUrl}'
                            }
                        });
                    }

                    function onPlayerReady(event) {
                        // event.target.playVideo();
                        if (${props.initialTime || 0} > 0) {
                            event.target.seekTo(${props.initialTime}, true);
                        }
                    }

                    function onPlayerStateChange(event) {
                        if (event.data == YT.PlayerState.PLAYING) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'play' }));
                            startProgressTracking();
                        } else if (event.data == YT.PlayerState.ENDED) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
                            stopProgressTracking();
                        } else {
                            stopProgressTracking();
                        }
                    }

                    var progressInterval;
                    function startProgressTracking() {
                        stopProgressTracking();
                        progressInterval = setInterval(function() {
                            if(player && player.getCurrentTime) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({ 
                                    type: 'timeUpdate', 
                                    currentTime: player.getCurrentTime(),
                                    duration: player.getDuration() 
                                }));
                            }
                        }, 1000);
                    }

                    function stopProgressTracking() {
                        if (progressInterval) clearInterval(progressInterval);
                    }
                </script>
            </body>
            </html>
        `;
    } else {
        // Standard HTML5 Video
        htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    body { margin: 0; background-color: black; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
                    video { width: 100%; height: 100%; max-height: 100vh; object-fit: contain; outline: none; }
                    .error-msg { color: white; position: absolute; top: 10px; left: 10px; z-index: 100; font-family: sans-serif; }
                </style>
            </head>
            <body>
                <video 
                    controls 
                    autoplay 
                    playsinline 
                    preload="auto"
                    controlsList="nodownload"
                    style="width: 100%; height: 100%;"
                    onerror="handleVideoError(this)"
                >
                    <source src="${videoUrl}" type="video/mp4">
                    <source src="${videoUrl}" type="video/webm">
                    <source src="${videoUrl}" type="application/x-mpegURL">
                    Your browser does not support the video tag.
                </video>
                <script>
                    function handleVideoError(v) {
                        var err = v.error;
                        var code = err ? err.code : 0;
                        var msg = err ? err.message : 'Unknown error';
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: 'Video Error ' + code + ': ' + msg + ' | URL: ' + v.currentSrc }));
                    }

                    (function() {
                        var video = document.querySelector('video');
                       
                        video.addEventListener('loadedmetadata', function() {
                             if (${props.initialTime || 0} > 0) {
                                video.currentTime = ${props.initialTime};
                             }
                        });

                        video.addEventListener('play', function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'play' }));
                        });
                        
                        video.addEventListener('timeupdate', function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                                type: 'timeUpdate', 
                                currentTime: video.currentTime,
                                duration: video.duration 
                            }));
                        });
                        
                        video.addEventListener('ended', function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
                        });

                        video.addEventListener('error', function(e) {
                             // handled by onerror attribute as well, but good to have
                        });
                    })();
                </script>
            </body>
            </html>
        `;
    }

    const injectedJavaScript = `true;`;

    const handleMessage = (event) => {
        if (!event.nativeEvent.data) return;
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'play' && props.onPlay) props.onPlay();
            if (data.type === 'timeUpdate' && props.onTimeUpdate) props.onTimeUpdate(data);
            if (data.type === 'ended' && props.onEnded) props.onEnded();
            if (data.type === 'error' && props.onError) props.onError(data.error);
        } catch (e) {
            console.error('Error parsing webview message:', e);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <WebView
                ref={ref}
                originWhitelist={['*']}
                source={{ html: htmlContent, baseUrl: ORG_CONFIG.webUrl }}
                style={{ flex: 1, backgroundColor: 'black' }}
                allowsFullscreenVideo={true}
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                injectedJavaScript={injectedJavaScript}
                onMessage={handleMessage}
                renderLoading={() => (
                    <View style={[styles.container, styles.center, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                )}
            />
        </View>
    );
});

export default CustomVideoPlayer;

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        overflow: 'hidden',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
