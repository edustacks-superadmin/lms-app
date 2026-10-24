import React from 'react';
import { 
    Platform, 
    View, 
    Text, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator, 
    StyleSheet, 
    StatusBar, 
    useWindowDimensions, 
    PanResponder, 
    Modal, 
    TextInput 
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as ScreenCapture from 'expo-screen-capture';
import { isScreenshotProtectionEnabled } from '../lib/configService';

import Constants from 'expo-constants';
import Pdf from 'react-native-pdf';

export default function PdfViewer({ url, headers, ...props }) {
    // ====== ALL HOOKS AT THE TOP ======
    const pdfRef = React.useRef(null);
    const [currentPage, setCurrentPage] = React.useState(props.initialPage || 1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [isScrubbing, setIsScrubbing] = React.useState(false);
    const [scrubPage, setScrubPage] = React.useState(props.initialPage || 1);
    const [jumpModalVisible, setJumpModalVisible] = React.useState(false);
    const [jumpInput, setJumpInput] = React.useState('');
    const lastCalledPageRef = React.useRef(props.initialPage || 1);

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

    const scrubTimeoutRef = React.useRef(null);
    const startThumbTopRef = React.useRef(0);

    // Fast-scroll track layout calculation
    const TRACK_TOP = 80;
    const TRACK_BOTTOM = 80;
    const THUMB_HEIGHT = 44;
    const trackHeight = Math.max(160, height - TRACK_TOP - TRACK_BOTTOM);
    const maxTravel = Math.max(1, trackHeight - THUMB_HEIGHT);

    // PanResponder for vertical scrubber track on the right edge
    // Uses relative delta (gestureState.dy) anchored to current position when touched,
    // so tapping/grabbing the thumb never suddenly jumps away from the current page!
    const panResponder = React.useMemo(() => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsScrubbing(true);
                // Anchor to current page's thumb position so touching NEVER jumps
                const currentProgress = totalPages > 1 ? (currentPage - 1) / (totalPages - 1) : 0;
                startThumbTopRef.current = currentProgress * maxTravel;
                setScrubPage(currentPage);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Calculate new position relative to where the thumb was when pressed
                const newThumbTop = Math.max(0, Math.min(maxTravel, startThumbTopRef.current + gestureState.dy));
                const ratio = maxTravel > 0 ? newThumbTop / maxTravel : 0;
                const targetPage = Math.max(1, Math.min(totalPages, Math.round(ratio * (totalPages - 1)) + 1));
                
                // Update thumb visual number immediately
                setScrubPage(targetPage);

                // Cancel previous debounced jump
                if (scrubTimeoutRef.current) {
                    clearTimeout(scrubTimeoutRef.current);
                }

                // Debounce native setPage so Pdfium background thread doesn't crash
                scrubTimeoutRef.current = setTimeout(() => {
                    if (pdfRef.current && targetPage !== lastCalledPageRef.current) {
                        lastCalledPageRef.current = targetPage;
                        try {
                            pdfRef.current.setPage(targetPage);
                        } catch (e) {
                            console.warn('[PdfViewer] setPage debounced error:', e);
                        }
                    }
                }, 250);
            },
            onPanResponderRelease: (evt, gestureState) => {
                setIsScrubbing(false);
                if (scrubTimeoutRef.current) {
                    clearTimeout(scrubTimeoutRef.current);
                    scrubTimeoutRef.current = null;
                }

                const newThumbTop = Math.max(0, Math.min(maxTravel, startThumbTopRef.current + gestureState.dy));
                const ratio = maxTravel > 0 ? newThumbTop / maxTravel : 0;
                const finalPage = Math.max(1, Math.min(totalPages, Math.round(ratio * (totalPages - 1)) + 1));
                
                setScrubPage(finalPage);
                setCurrentPage(finalPage);
                lastCalledPageRef.current = finalPage;

                // Final single jump on release
                try {
                    if (pdfRef.current) {
                        pdfRef.current.setPage(finalPage);
                    }
                } catch (e) {
                    console.warn('[PdfViewer] setPage on release error:', e);
                }
            },
            onPanResponderTerminate: () => {
                setIsScrubbing(false);
                if (scrubTimeoutRef.current) {
                    clearTimeout(scrubTimeoutRef.current);
                    scrubTimeoutRef.current = null;
                }
            },
        });
    }, [totalPages, maxTravel, height, currentPage]);

    // Cleanup scrub timer on unmount
    React.useEffect(() => {
        return () => {
            if (scrubTimeoutRef.current) {
                clearTimeout(scrubTimeoutRef.current);
            }
        };
    }, []);

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

    // Screenshot Protection for PDF Viewer
    React.useEffect(() => {
        let isMounted = true;
        const initProtection = async () => {
            try {
                const shouldBlock = await isScreenshotProtectionEnabled('pdf');
                if (shouldBlock && isMounted) {
                    await ScreenCapture.preventScreenCaptureAsync();
                }
            } catch (e) {
                console.warn('Error setting PDF screen capture protection:', e);
            }
        };
        initProtection();

        return () => {
            isMounted = false;
            isScreenshotProtectionEnabled('global').then(isGlobal => {
                if (!isGlobal) {
                    ScreenCapture.allowScreenCaptureAsync().catch(() => {});
                }
            });
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

    const jumpByPages = (delta) => {
        const targetPage = Math.max(1, Math.min(totalPages, currentPage + delta));
        setCurrentPage(targetPage);
        setScrubPage(targetPage);
        if (pdfRef.current) {
            lastCalledPageRef.current = targetPage;
            try {
                pdfRef.current.setPage(targetPage);
            } catch (e) {
                console.warn('[PdfViewer] jumpByPages error:', e);
            }
        }
    };

    const handleJumpToPage = () => {
        const pageNum = parseInt(jumpInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setScrubPage(pageNum);
            if (pdfRef.current) {
                lastCalledPageRef.current = pageNum;
                try {
                    pdfRef.current.setPage(pageNum);
                } catch (e) {
                    console.warn('[PdfViewer] handleJumpToPage error:', e);
                }
            }
            setJumpModalVisible(false);
        } else {
            Alert.alert('Invalid Page', `Please enter a valid page number between 1 and ${totalPages}.`);
        }
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

        // Render PDF from local file - FULL SCREEN with fast scrollbar scrubber
        const activePage = isScrubbing ? scrubPage : currentPage;
        const currentThumbProgress = totalPages > 1 ? (activePage - 1) / (totalPages - 1) : 0;
        const thumbTop = Math.max(0, Math.min(maxTravel, currentThumbProgress * maxTravel));

        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
                <StatusBar hidden={true} />
                <Pdf
                    ref={pdfRef}
                    source={{ uri: localPdfPath }}
                    page={props.initialPage || 1}
                    onPageChanged={(page, numberOfPages) => {
                        console.log(`[PdfViewer] Page changed: ${page} / ${numberOfPages}`);
                        if (!isScrubbing) {
                            setCurrentPage(page);
                            setScrubPage(page);
                        }
                        setTotalPages(numberOfPages);
                        if (props.onPageChanged) {
                            props.onPageChanged(page);
                        }
                    }}
                    style={{ flex: 1, width: width, height: height, backgroundColor: '#0f172a' }}
                    enablePaging={false}
                    horizontal={false}
                    showsVerticalScrollIndicator={true}
                    onLoadProgress={(percent) => {
                        console.log(`PDF Rendering: ${Math.round(percent * 100)}%`);
                    }}
                    onLoadComplete={(numberOfPages, filePath) => {
                        console.log(`PDF Rendered: ${numberOfPages} pages`);
                        setTotalPages(numberOfPages);
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

                {/* Right-Side Fast-Scroller Track & Thumb */}
                {totalPages > 1 && !isRendering && (
                    <View 
                        style={[styles.scrubberContainer, { top: TRACK_TOP, height: trackHeight }]}
                        {...panResponder.panHandlers}
                    >
                        {/* Subtle vertical track rail */}
                        <View style={styles.scrubberRail} />

                        {/* Draggable Scrubber Thumb with Page Number */}
                        <View 
                            style={[
                                styles.scrubberThumb, 
                                { top: thumbTop },
                                isScrubbing && styles.scrubberThumbActive
                            ]}
                        >
                            <Ionicons name="swap-vertical" size={12} color="#ffffff" style={{ opacity: 0.9 }} />
                            <Text style={styles.scrubberThumbText} numberOfLines={1}>
                                {isScrubbing ? scrubPage : currentPage}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Quick Navigation Pill at Bottom */}
                {totalPages > 1 && !isRendering && (
                    <View style={styles.bottomNavPill}>
                        <TouchableOpacity
                            style={styles.navPageButton}
                            onPress={() => jumpByPages(-5)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="play-back" size={13} color="#94a3b8" />
                            <Text style={styles.navButtonSubText}>-5</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.pageInfoButton}
                            onPress={() => {
                                setJumpInput(String(currentPage));
                                setJumpModalVisible(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.pageInfoText}>
                                Page <Text style={{ color: '#60a5fa', fontWeight: 'bold' }}>{currentPage}</Text> of {totalPages}
                            </Text>
                            <Ionicons name="search-outline" size={12} color="#60a5fa" style={{ marginLeft: 5 }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navPageButton}
                            onPress={() => jumpByPages(5)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.navButtonSubText}>+5</Text>
                            <Ionicons name="play-forward" size={13} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Jump to Page Modal */}
                <Modal
                    visible={jumpModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setJumpModalVisible(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalBackdrop} 
                        activeOpacity={1} 
                        onPress={() => setJumpModalVisible(false)}
                    >
                        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                            <Text style={styles.modalTitle}>Jump to Page</Text>
                            <Text style={styles.modalSubtitle}>Enter page number (1 - {totalPages})</Text>

                            <TextInput
                                style={styles.modalInput}
                                keyboardType="number-pad"
                                value={jumpInput}
                                onChangeText={setJumpInput}
                                autoFocus={true}
                                selectTextOnFocus={true}
                                placeholder="1"
                                placeholderTextColor="#64748b"
                            />

                            <View style={styles.modalButtonRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setJumpModalVisible(false)}
                                >
                                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalJumpButton}
                                    onPress={handleJumpToPage}
                                >
                                    <Text style={styles.modalJumpButtonText}>Go to Page</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

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
    // Fast Scroller Styles
    scrubberContainer: {
        position: 'absolute',
        right: 0,
        width: 48,
        zIndex: 50,
        alignItems: 'center',
    },
    scrubberRail: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 15,
        width: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 2,
    },
    scrubberThumb: {
        position: 'absolute',
        right: 4,
        width: 38,
        height: 44,
        backgroundColor: '#1e293b',
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
    },
    scrubberThumbActive: {
        backgroundColor: '#2563eb',
        borderColor: '#93c5fd',
        transform: [{ scale: 1.08 }],
        elevation: 10,
    },
    scrubberThumbText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 1,
    },
    // Bottom Navigator Pill
    bottomNavPill: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.90)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        borderWidth: 1,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        zIndex: 40,
    },
    pageInfoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    pageInfoText: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '600',
    },
    navPageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    navButtonSubText: {
        color: '#cbd5e1',
        fontSize: 11,
        fontWeight: 'bold',
        marginHorizontal: 2,
    },
    // Jump Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
        elevation: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#94a3b8',
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: '#0f172a',
        borderWidth: 1.5,
        borderColor: '#3b82f6',
        borderRadius: 10,
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 10,
        marginBottom: 20,
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    modalCancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    modalCancelButtonText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 14,
    },
    modalJumpButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#2563eb',
    },
    modalJumpButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
