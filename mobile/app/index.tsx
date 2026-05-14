import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler, ActivityIndicator, Platform, Animated, Easing, Image, AppState, PermissionsAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { supabase } from '../src/services/supabase';
import { registerForPushNotificationsAsync } from '../src/services/notifications';

const customUserAgent = Platform.OS === 'android'
  ? 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36'
  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

export default function App() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('https://debugtodeploy.com');
  
  // Animation States
  const [animationDone, setAnimationDone] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide native static splash immediately
    SplashScreen.hideAsync().catch(() => {});

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
          if (parsed.fragment) {
            targetUrl += `#${parsed.fragment}`;
          }
          setCurrentUrl(targetUrl);
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    
    return () => {
      subscription.remove();
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
      if (data.type === 'AUTH_STATE_SYNC') {
        const { access_token, refresh_token } = data.payload;
        
        // Sync native session with web session
        await supabase.auth.setSession({
          access_token,
          refresh_token
        });

        // Trigger push registration now that we are authenticated natively
        await registerForPushNotificationsAsync();
      }
    } catch (err) {
      console.warn('WebView Bridge Error:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['bottom', 'left', 'right']}>
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
        onPermissionRequest={(request) => {
          request.grant(request.resources);
        }}
        scalesPageToFit={false}
        injectedJavaScript={`
          // Lock viewport and disable zoom
          const meta = document.createElement('meta');
          meta.name = 'viewport';
          meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
          document.getElementsByTagName('head')[0].appendChild(meta);

          // Fix overflow-x to prevent horizontal scrolling inside WebView
          document.documentElement.style.overflowX = 'hidden';
          document.body.style.overflowX = 'hidden';
          true;
        `}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          // Explicitly request native permissions when entering interview page
          if (Platform.OS === 'android' && navState.url.includes('/interviews')) {
            PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              PermissionsAndroid.PERMISSIONS.CAMERA,
            ]).catch(err => console.warn('Permission Request Error:', err));
          }
        }}
        onMessage={onMessage}
        onLoadEnd={() => setIsLoading(false)}
        allowsInlineMediaPlayback={true}
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
    zIndex: 10, // Ensure it sits above the WebView
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  }
});
