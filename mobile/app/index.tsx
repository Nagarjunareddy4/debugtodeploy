import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, BackHandler, Platform, Animated, Easing, AppState, PermissionsAndroid, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { supabase } from '../src/services/supabase';
import { registerForPushNotificationsAsync } from '../src/services/notifications';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const customUserAgent = Platform.OS === 'android'
  ? 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('https://debugtodeploy.com');
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Stores the Supabase access token synced from the WebView session
  const accessTokenRef = useRef<string | null>(null);

  // Animation States
  const [animationDone, setAnimationDone] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide native static splash immediately
    SplashScreen.hideAsync().catch(() => {});

    // Proactively request Microphone and Camera permissions on Android
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]).catch(err => console.warn('Initial Permission Request Error:', err));
    }

    // Handle deep linking
    const handleUrl = (url: string | null) => {
      if (url) {
        const parsed = Linking.parse(url);
        // If the URL contains a path, append it. Otherwise use the base URL.
        if (parsed.path) {
          let targetUrl = `https://debugtodeploy.com/${parsed.path}`;
          if (parsed.queryParams) {
            const query = new URLSearchParams(parsed.queryParams as any).toString();
            if (query) targetUrl += `?${query}`;
          }
          if ((parsed as any).fragment) {
            targetUrl += `#${(parsed as any).fragment}`;
          }
          setCurrentUrl(targetUrl);
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    // Reload WebView if app was backgrounded for > 30 minutes (session may expire)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        const bgDuration = backgroundedAtRef.current ? Date.now() - backgroundedAtRef.current : 0;
        if (bgDuration > 30 * 60 * 1000) {
          webViewRef.current?.reload();
        }
        backgroundedAtRef.current = null;
      } else if (nextState.match(/inactive|background/)) {
        backgroundedAtRef.current = Date.now();
        Speech.stop().catch(() => {});
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
      appStateSub.remove();
    };
  }, []);

  const playAnimation = () => {
    // Reset animation state
    setAnimationDone(false);
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);

    // Small delay to ensure render is ready
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 6,
            duration: 600,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          })
        ])
      ]).start(() => {
        setAnimationDone(true);
      });
    }, 500);
  };

  // Run the exit animation only after WebView has finished loading
  useEffect(() => {
    if (!isLoading) {
      playAnimation();
    }
  }, [isLoading]);

  // NOTE: Intentionally NOT replaying the splash animation on app resume.
  // Replaying it every time the app is foregrounded feels janky and distracting.
  // The animation only plays once — on the initial load of the WebView.

  // Handle Android physical back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true; // Prevent default behavior (exiting app)
        }
        return false; // Let default behavior happen
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [canGoBack])
  );
  
  const onMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // ── TTS bridge ──────────────────────────────────────────
      if (data.type === 'AUTH_STATE_SYNC') {
        const { access_token, refresh_token } = data.payload;
        // Cache token so native recording can call Whisper directly
        accessTokenRef.current = access_token;
        await supabase.auth.setSession({ access_token, refresh_token });
        await registerForPushNotificationsAsync();

      } else if (data.type === 'SPEECH_SPEAK') {
        const { text } = data.payload;
        try {
          await Speech.stop();
          setTimeout(() => {
            Speech.speak(text, { language: 'en-US', rate: 0.95, pitch: 1.0 });
          }, 150);
        } catch (err) {
          console.warn('Native speech error:', err);
        }

      } else if (data.type === 'SPEECH_CANCEL') {
        try { await Speech.stop(); } catch (err) { console.warn('Native speech stop error:', err); }

      // ── Native audio recording bridge ────────────────────────
      } else if (data.type === 'AUDIO_RECORD_START') {
        try {
          // Stop any previous recording
          if (recordingRef.current) {
            try { await recordingRef.current.stopAndUnloadAsync(); } catch { /* already stopped */ }
            recordingRef.current = null;
          }
          // Request permissions via expo-av (respects Android manifest)
          const { granted } = await Audio.requestPermissionsAsync();
          if (!granted) {
            webViewRef.current?.injectJavaScript(
              `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'AUDIO_RECORD_ERROR', payload: { message: 'Microphone permission denied' } }) })); true;`
            );
            return;
          }
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
          const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );
          recordingRef.current = recording;
        } catch (err: any) {
          console.warn('Native recording start error:', err);
          webViewRef.current?.injectJavaScript(
            `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'AUDIO_RECORD_ERROR', payload: { message: '${String(err?.message || 'Recording failed').replace(/'/g, "'")}' } }) })); true;`
          );
        }

      } else if (data.type === 'AUDIO_RECORD_STOP') {
        try {
          const recording = recordingRef.current;
          if (!recording) {
            webViewRef.current?.injectJavaScript(
              `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'AUDIO_TRANSCRIPT_RESULT', payload: { transcript: '', error: 'No active recording found' } }) })); true;`
            );
            return;
          }

          await recording.stopAndUnloadAsync();
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
          const uri = recording.getURI();
          recordingRef.current = null;

          if (!uri) {
            webViewRef.current?.injectJavaScript(
              `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'AUDIO_TRANSCRIPT_RESULT', payload: { transcript: '', error: 'Recording file not found' } }) })); true;`
            );
            return;
          }

          // ── Read audio as base64 using expo-file-system (works for file:// URIs) ──
          const base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });

          // ── Build multipart FormData for Whisper API ──
          // React Native fetch supports multipart with uri-based file objects
          const filename = Platform.OS === 'ios' ? 'recording.m4a' : 'recording.m4a';
          const mimeType = 'audio/m4a';

          const formData = new FormData();
          formData.append('file', {
            uri,
            name: filename,
            type: mimeType,
          } as any);
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');

          // ── Get auth token (use cached ref or fall back to supabase session) ──
          let authToken = accessTokenRef.current;
          if (!authToken) {
            const { data: sessionData } = await supabase.auth.getSession();
            authToken = sessionData.session?.access_token || null;
          }

          // ── Call Whisper transcription API directly from native ──
          const whisperRes = await fetch('https://debugtodeploy.com/api/openai-proxy?path=v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: formData,
          });

          if (!whisperRes.ok) {
            const errText = await whisperRes.text();
            throw new Error(`Whisper API error ${whisperRes.status}: ${errText.slice(0, 120)}`);
          }

          const whisperData = await whisperRes.json();
          const transcript = (whisperData.text || '').trim();

          // ── Inject only the plain transcript text back — no base64 over the bridge ──
          const safeTranscript = transcript
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");
          webViewRef.current?.injectJavaScript(
            `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'AUDIO_TRANSCRIPT_RESULT', payload: { transcript: '${safeTranscript}' } }) })); true;`
          );

          // Clean up temp recording file
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

        } catch (err: any) {
          console.warn('Native recording stop error:', err);
          const safeMsg = String(err?.message || 'Recording failed')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");
          webViewRef.current?.injectJavaScript(
            `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'AUDIO_TRANSCRIPT_RESULT', payload: { transcript: '', error: '${safeMsg}' } }) })); true;`
          );
        }
      }
    } catch (err) {
      console.warn('WebView Bridge Error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" backgroundColor="#0A0A0B" translucent={false} />
      {/* WebView loads the main web app */}
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        userAgent={customUserAgent}
        textZoom={100}
        bounces={false}
        androidLayerType="hardware"
        mediaPlaybackRequiresUserAction={false}
        allowsProtectedMedia={true}
        // @ts-ignore - mediaCapturePermissionGrantType is Android-specific
        mediaCapturePermissionGrantType="grant"
        // @ts-ignore - onPermissionRequest typing is sometimes missing in older RN webview versions but works at runtime
        onPermissionRequest={(request: any) => {
          // Explicitly grant resources requested by the WebView for our domain or dev/preview environments
          const origin = request.origin.toLowerCase();
          const isProduction = origin.includes('debugtodeploy.com');
          const isPreview = origin.includes('vercel.app') || 
                           origin.includes('amplifyapp.com') ||
                           origin.includes('github.io');
          const isDevelopment = origin.includes('localhost') || 
                               origin.includes('10.0.2.2') || 
                               origin.startsWith('http://192.168.');
          
          if (isProduction || isPreview || isDevelopment) {
            request.grant(request.resources);
          } else {
            request.deny();
          }
        }}
        originWhitelist={['https://debugtodeploy.com', 'https://*.vercel.app', 'http://localhost:*', 'http://10.0.2.2:*', 'http://192.168.*']}
        mixedContentMode="never"
        scalesPageToFit={false}
        injectedJavaScript={`
          (function() {
            // Lock viewport and disable zoom
            var existing = document.querySelector('meta[name="viewport"]');
            if (existing) {
              existing.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            } else {
              var meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
              document.getElementsByTagName('head')[0].appendChild(meta);
            }
            // Fix overflow-x to prevent horizontal scrolling inside WebView
            document.documentElement.style.overflowX = 'hidden';
            document.body.style.overflowX = 'hidden';
            // Prevent double-tap zoom on iOS
            document.addEventListener('dblclick', function(e) { e.preventDefault(); }, { passive: false });
            // Guard: if getUserMedia is not available (Android WebView sandbox), flag it so
            // the app-level bridge handler can take over instead of crashing silently.
            if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
              Object.defineProperty(navigator, 'mediaDevices', {
                value: {
                  getUserMedia: function() {
                    return Promise.reject(new DOMException('getUserMedia not available in this WebView — using native bridge', 'NotAllowedError'));
                  }
                },
                writable: false
              });
            }
          })();
          true;
        `}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          // If the user navigates to interviews, re-verify permissions just in case
          if (Platform.OS === 'android' && navState.url.includes('/interviews')) {
            PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              PermissionsAndroid.PERMISSIONS.CAMERA,
            ]).catch(err => console.warn('Permission Re-check Error:', err));
          }
        }}
        onMessage={onMessage}
        onLoadEnd={() => { setIsLoading(false); setHasError(false); }}
        onError={() => setHasError(true)}
        onHttpError={(e) => { if (e.nativeEvent.statusCode >= 500) setHasError(true); }}
        allowsInlineMediaPlayback={true}
        allowFileAccess={true}
        cacheEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
      />

      {/* Animated Overlay - renders on top of WebView until done */}
      {!animationDone && (
        <Animated.View style={[styles.splashContainer, { opacity: opacityAnim }]} pointerEvents="none">
          <Animated.Image
            source={require('../assets/images/logo.jpg')}
            style={[styles.logo, { transform: [{ scale: scaleAnim }] }]}
          />
        </Animated.View>
      )}

      {/* Error overlay - shown when WebView fails to load */}
      {hasError && animationDone && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorBody}>
            Unable to reach DebugToDeploy.{`\n`}Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              webViewRef.current?.reload();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 200,
    height: 200,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorBody: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#00D2FF',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 50,
  },
  retryText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
