import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler, ActivityIndicator, Platform, Animated, Easing, Image, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

const customUserAgent = Platform.OS === 'android'
  ? 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36'
  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation States
  const [animationDone, setAnimationDone] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide native static splash immediately
    SplashScreen.hideAsync().catch(() => {});
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

  // Listen to app state changes to replay animation on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && !isLoading) {
        playAnimation();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLoading]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* We no longer need ActivityIndicator because the splash screen covers it! */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://debugtodeploy.com' }}
        style={styles.webview}
        userAgent={customUserAgent}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
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
