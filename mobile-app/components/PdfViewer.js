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
    const [isRendering, setIsRendering] = React.useState(true);

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

    // Append platform param
    const finalUrl = url ? (url.includes('?') ? `${url}&platform=mobile` : `${url}?platform=mobile`) : '';

    // Download PDF to local cache first (avoids SSL/network issues with react-native-pdf)
    React.useEffect(() => {
        if (!isAndroidProd || !url) return;

        const downloadPdf = async () => {
            try {
                setIsDownloading(true);
                console.log('Downloading PDF to cache:', finalUrl);

                // Generate unique filename based on URL
                const urlHash = finalUrl.split('id=')[1]?.split('&')[0] || Date.now();
                const filename = `pdf_${urlHash}.pdf`;
                const fileUri = `${FileSystem.cacheDirectory}${filename}`;

                // Check if file already exists
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                if (fileInfo.exists) {
                    console.log('Using cached PDF:', fileUri);
                    setLocalPdfPath(fileUri);
                    setIsDownloading(false);
                    return;
                }

                // Download the PDF
                const downloadRes = await FileSystem.downloadAsync(finalUrl, fileUri, {
                    headers: { ...headers, 'x-platform': 'mobile' }
                });

                if (downloadRes.status === 200) {
                    console.log('PDF downloaded successfully:', downloadRes.uri);
                    setLocalPdfPath(downloadRes.uri);
                } else {
                    let errorMsg = `Server returned status ${downloadRes.status}`;
                    if (downloadRes.status === 404) {
                        errorMsg = 'PDF not found on server. Please contact support.';
                    } else if (downloadRes.status === 403) {
                        errorMsg = 'Access to this PDF is restricted.';
                    } else if (downloadRes.status === 503) {
                        errorMsg = 'Server temporarily unavailable. Please try again.';
                    }
                    setDownloadError(errorMsg);
                }
            } catch (err) {
                console.error('PDF Download Error:', err);
                setDownloadError(`Network error: ${err.message}`);
            } finally {
                setIsDownloading(false);
            }
        };

        downloadPdf();
    }, [finalUrl, isAndroidProd]);

    // ====== HELPER FUNCTIONS ======
    const handleOpenExternally = async () => {
        // Prevent multiple calls
        if (isDownloading) return;

        try {
            setIsDownloading(true);
            const downloadUrl = url.includes('?') ? `${url}&platform=mobile` : `${url}?platform=mobile`;
            const filename = `external_${Date.now()}.pdf`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri, {
                headers: { ...headers, 'x-platform': 'mobile' }
            });

            if (downloadRes.status === 200) {
                const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);

                if (Platform.OS === 'android') {
                    try {
                        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                            data: contentUri,
                            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                            type: 'application/pdf',
                        });
                    } catch (intentError) {
                        // Handle "activity already started" error gracefully
                        if (intentError.message?.includes('already started')) {
                            console.log('Intent already started, ignoring duplicate');
                        } else {
                            throw intentError;
                        }
                    }
                }
            } else {
                alert(`Failed to download PDF (Status: ${downloadRes.status})`);
            }
        } catch (error) {
            console.error('PDF Open Error:', error);
            alert(`Could not open PDF: ${error.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const retryDownload = () => {
        setDownloadError(null);
        setLocalPdfPath(null);
        // Re-trigger useEffect by toggling a state (simulated)
        setIsRendering(true);
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
        // Show download error
        if (downloadError) {
            return (
                <View style={styles.centerContainer}>
                    <Ionicons name="warning-outline" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
                    <Text style={styles.errorText}>{downloadError}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity onPress={retryDownload} style={[styles.button, { marginRight: 10 }]}>
                            <Ionicons name="refresh-outline" size={18} color="white" />
                            <Text style={styles.buttonText}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleOpenExternally} style={styles.button}>
                            <Ionicons name="open-outline" size={18} color="white" />
                            <Text style={styles.buttonText}>Open Externally</Text>
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
                        Alert.alert(
                            'PDF Viewer Error',
                            'Could not display PDF. Use the button below to open externally.',
                            [{ text: "OK" }]
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

    // Android Development (Expo Go): Fallback to system viewer
    return (
        <View style={styles.centerContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#10b981" style={{ marginBottom: 20 }} />
            <Text style={styles.versionText}>BUILD VERSION: V6 (Download-First)</Text>
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
