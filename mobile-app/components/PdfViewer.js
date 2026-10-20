import React from 'react';
import { Platform, View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, StatusBar, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';

import Constants from 'expo-constants';
import Pdf from 'react-native-pdf';

export default function PdfViewer({ url, headers, ...props }) {
    // ====== ALL HOOKS AT THE TOP ======
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [localPdfPath, setLocalPdfPath] = React.useState(null);
    const [downloadError, setDownloadError] = React.useState(null);
    const [renderError, setRenderError] = React.useState(null);
    const [isRendering, setIsRendering] = React.useState(true);
    const [retryCount, setRetryCount] = React.useState(0);

    // Dynamic dimensions - updates automatically on rotation
    const { width, height } = useWindowDimensions();

    const isExpoGo = Constants.appOwnership === 'expo';
    const isAndroidProd = !isExpoGo && Platform.OS === 'android';

    // Enable auto-rotate when PDF viewer mounts, lock back when unmounting
    React.useEffect(() => {
        const enableAutoRotate = async () => {
            try {
                await ScreenOrientation.unlockAsync();
            } catch (e) {
                console.log('Could not unlock orientation:', e);
            }
        };

        enableAutoRotate();

        // Cleanup: lock back to portrait when leaving PDF viewer
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
        };
    }, []);

    // Append platform param if not already present
    const finalUrl = React.useMemo(() => {
        if (!url) return '';
        if (url.includes('platform=mobile')) return url;
        return url.includes('?') ? `${url}&platform=mobile` : `${url}?platform=mobile`;
    }, [url]);

    // Download PDF to local cache first (avoids SSL/network issues with react-native-pdf)
    React.useEffect(() => {
        if (!isAndroidProd || !finalUrl) return;

        let isMounted = true;

        const downloadPdf = async () => {
            try {
                setIsDownloading(true);
                setDownloadError(null);
                setRenderError(null);
                setIsRendering(true);

                // Derive a stable cache key
                let fileKey = 'doc';
                if (finalUrl.includes('id=')) {
                    fileKey = finalUrl.split('id=')[1]?.split('&')[0];
                } else {
                    const cleanPath = finalUrl.split('?')[0];
                    const lastPart = cleanPath.split('/').pop();
                    if (lastPart) {
                        fileKey = lastPart.replace(/[^a-zA-Z0-9_-]/g, '_');
                    }
                }

                const filename = `pdf_${fileKey}.pdf`;
                const fileUri = `${FileSystem.cacheDirectory}${filename}`;

                // Check if file already exists in cache
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                if (fileInfo.exists) {
                    if (fileInfo.size > 2000) {
                        // Check header to ensure it's not a corrupt HTML response
                        const header = await FileSystem.readAsStringAsync(fileUri, { length: 30 }).catch(() => '');
                        if (!header.toLowerCase().includes('<!doctype') && !header.toLowerCase().includes('<html')) {
                            console.log('Using valid cached PDF:', fileUri, 'size:', fileInfo.size);
                            if (isMounted) {
                                setLocalPdfPath(fileUri);
                                setIsDownloading(false);
                            }
                            return;
                        }
                    }
                    // Invalid/corrupt cached file, remove it
                    console.log('Removing corrupt cached PDF:', fileUri);
                    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
                }

                // Download the PDF
                console.log('Downloading PDF to cache from:', finalUrl);
                const downloadRes = await FileSystem.downloadAsync(finalUrl, fileUri, {
                    headers: { ...headers, 'x-platform': 'mobile' }
                });

                if (downloadRes.status === 200) {
                    const postInfo = await FileSystem.getInfoAsync(downloadRes.uri);
                    if (!postInfo.exists || postInfo.size < 1000) {
                        await FileSystem.deleteAsync(downloadRes.uri, { idempotent: true }).catch(() => {});
                        throw new Error('Downloaded PDF is empty or incomplete.');
                    }

                    // Check for HTML response disguised as 200 OK
                    const preview = await FileSystem.readAsStringAsync(downloadRes.uri, { length: 30 }).catch(() => '');
                    if (preview.toLowerCase().includes('<!doctype') || preview.toLowerCase().includes('<html')) {
                        await FileSystem.deleteAsync(downloadRes.uri, { idempotent: true }).catch(() => {});
                        throw new Error('Server returned an invalid page instead of a PDF document.');
                    }

                    console.log('PDF downloaded and verified successfully:', downloadRes.uri, 'size:', postInfo.size);
                    if (isMounted) {
                        setLocalPdfPath(downloadRes.uri);
                    }
                } else {
                    let errorMsg = `Server returned status ${downloadRes.status}`;
                    if (downloadRes.status === 404) {
                        errorMsg = 'PDF document not found on server.';
                    } else if (downloadRes.status === 403) {
                        errorMsg = 'Access to this PDF is restricted.';
                    } else if (downloadRes.status === 503) {
                        errorMsg = 'Server temporarily unavailable. Please try again.';
                    }
                    if (isMounted) {
                        setDownloadError(errorMsg);
                    }
                }
            } catch (err) {
                console.error('PDF Download Error:', err);
                if (isMounted) {
                    setDownloadError(err.message || 'Network error occurred while fetching PDF.');
                }
            } finally {
                if (isMounted) {
                    setIsDownloading(false);
                }
            }
        };

        downloadPdf();

        return () => {
            isMounted = false;
        };
    }, [finalUrl, isAndroidProd, retryCount]);

    // ====== HELPER FUNCTIONS ======
    const handleOpenExternally = async () => {
        if (isDownloading) return;

        try {
            setIsDownloading(true);
            let targetFileUri = localPdfPath;

            // If we don't have a valid local PDF yet, download one
            if (!targetFileUri) {
                const downloadUrl = finalUrl;
                const filename = `external_${Date.now()}.pdf`;
                const fileUri = `${FileSystem.cacheDirectory}${filename}`;

                const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri, {
                    headers: { ...headers, 'x-platform': 'mobile' }
                });

                if (downloadRes.status === 200) {
                    targetFileUri = downloadRes.uri;
                } else {
                    Alert.alert('Download Failed', `Could not download PDF (Server status: ${downloadRes.status})`);
                    return;
                }
            }

            const contentUri = await FileSystem.getContentUriAsync(targetFileUri);

            if (Platform.OS === 'android') {
                try {
                    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                        data: contentUri,
                        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                        type: 'application/pdf',
                    });
                } catch (intentError) {
                    if (intentError.message?.includes('already started')) {
                        console.log('Intent already started, ignoring duplicate');
                    } else {
                        throw intentError;
                    }
                }
            }
        } catch (error) {
            console.error('PDF External Open Error:', error);
            Alert.alert('Could Not Open PDF', error.message || 'Please install a PDF reader app like Google Drive or Adobe Acrobat.');
        } finally {
            setIsDownloading(false);
        }
    };

    const retryDownload = async () => {
        setDownloadError(null);
        setRenderError(null);
        if (localPdfPath) {
            await FileSystem.deleteAsync(localPdfPath, { idempotent: true }).catch(() => {});
        }
        setLocalPdfPath(null);
        setIsRendering(true);
        setRetryCount(prev => prev + 1);
    };

    // ====== RENDER LOGIC ======

    // No URL provided
    if (!url) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.grayText}>No PDF URL provided</Text>
            </View>
        );
    }

    // iOS: WebView handles PDF natively
    if (Platform.OS === 'ios') {
        return (
            <WebView
                source={{ uri: url, headers: headers }}
                style={{ flex: 1, backgroundColor: '#0f172a' }}
                originWhitelist={['*']}
            />
        );
    }

    // Android Production: Download first, then render with react-native-pdf
    if (isAndroidProd) {
        // Show download or render error
        if (downloadError || renderError) {
            return (
                <View style={styles.centerContainer}>
                    <Ionicons name="warning-outline" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
                    <Text style={styles.errorText}>{downloadError || renderError}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity onPress={retryDownload} style={[styles.button, { marginRight: 10 }]}>
                            <Ionicons name="refresh-outline" size={18} color="white" />
                            <Text style={styles.buttonText}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleOpenExternally} style={styles.button}>
                            <Ionicons name="open-outline" size={18} color="white" />
                            <Text style={styles.buttonText}>Open in External App</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        // Show download progress
        if (isDownloading || !localPdfPath) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.grayText}>Loading PDF...</Text>
                </View>
            );
        }

        // Render PDF from local file - FULL SCREEN with auto-rotate
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
                <StatusBar hidden={true} />
                <Pdf
                    source={{ uri: localPdfPath }}
                    page={props.initialPage || 1}
                    onPageChanged={(page, numberOfPages) => {
                        console.log(`[PdfViewer] Page changed: ${page} / ${numberOfPages}`);
                        if (props.onPageChanged) {
                            props.onPageChanged(page);
                        }
                    }}
                    style={{ flex: 1, width: width, height: height, backgroundColor: '#0f172a' }}
                    enablePaging={false}
                    horizontal={false}
                    onLoadProgress={(percent) => {
                        console.log(`PDF Rendering: ${Math.round(percent * 100)}%`);
                    }}
                    onLoadComplete={(numberOfPages, filePath) => {
                        console.log(`PDF Rendered: ${numberOfPages} pages`);
                        setIsRendering(false);
                    }}
                    onError={(error) => {
                        console.error('PDF Render Error:', error);
                        setIsRendering(false);
                        setRenderError('Could not display PDF internally.');
                        Alert.alert(
                            'PDF Viewer Notice',
                            'Could not render PDF in the built-in viewer. Would you like to open it with your device\'s PDF reader (e.g. Google Drive, Adobe Acrobat)?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Open in App', onPress: handleOpenExternally }
                            ]
                        );
                    }}
                />

                {isRendering && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.grayText}>Rendering...</Text>
                    </View>
                )}
            </View>
        );
    }

    // Fallback: system viewer / dev build
    return (
        <View style={styles.centerContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#10b981" style={{ marginBottom: 20 }} />
            <Text style={styles.versionText}>BUILD VERSION: V7</Text>
            <Text style={styles.modeText}>Mode: {isExpoGo ? 'Expo Go' : 'Dev Build'}</Text>
            <Text style={styles.infoText}>
                {isExpoGo
                    ? "In production, this PDF opens inside the app. For testing, use the button below."
                    : "Open this document in your device's PDF viewer."}
            </Text>
            <TouchableOpacity
                onPress={handleOpenExternally}
                disabled={isDownloading}
                style={[styles.mainButton, isDownloading && styles.disabledButton]}
            >
                {isDownloading ? (
                    <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                ) : (
                    <Ionicons name="open-outline" size={20} color="white" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.buttonText}>
                    {isDownloading ? 'Downloading...' : 'Open PDF'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 20,
    },
    grayText: {
        color: '#94a3b8',
        marginTop: 10,
    },
    errorText: {
        color: '#fca5a5',
        textAlign: 'center',
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    button: {
        backgroundColor: '#2563EB',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 6,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: '#2563EB',
        padding: 12,
        borderRadius: 30,
        elevation: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    floatingButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    versionText: {
        color: '#60a5fa',
        fontSize: 12,
        marginBottom: 10,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    modeText: {
        color: '#94a3b8',
        fontSize: 11,
        marginBottom: 20,
        textAlign: 'center',
    },
    infoText: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 30,
        textAlign: 'center',
    },
    mainButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#475569',
    },
});
