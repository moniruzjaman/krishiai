import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  StatusBar,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// ─── Config ───────────────────────────────────────────────────────────────────
// Replace with your deployed Vercel URL after deploying the web app
const WEB_APP_URL = 'https://krishiai-lv7l6n8yo-krishi-ai-team.vercel.app';

// Keep splash screen visible until app is ready
SplashScreen.preventAutoHideAsync();

// ─── Native Bridge Script (injected into WebView) ──────────────────────────
// Exposes native capabilities to the web app via window.KrishiNative
const NATIVE_BRIDGE_SCRIPT = `
(function() {
  window.KrishiNative = {
    platform: '${Platform.OS}',
    version: '2.1.0',
    
    // Request location from native side
    getLocation: function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GET_LOCATION' }));
    },
    
    // Request camera permission
    requestCamera: function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_CAMERA' }));
    },
    
    // Store data securely
    secureStore: function(key, value) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SECURE_STORE', key, value }));
    },
    
    // Retrieve secure data
    secureGet: function(key) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SECURE_GET', key }));
    },

    // Share content natively
    share: function(text) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHARE', text }));
    },
  };

  // Notify web app that native bridge is ready
  window.dispatchEvent(new CustomEvent('KrishiNativeReady', { detail: { platform: '${Platform.OS}' } }));
  true;
})();
`;

// ─── Offline Screen ─────────────────────────────────────────────────────────
function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.offlineContainer}>
      <Text style={styles.offlineEmoji}>🌾</Text>
      <Text style={styles.offlineTitle}>ইন্টারনেট সংযোগ নেই</Text>
      <Text style={styles.offlineSubtitle}>No Internet Connection</Text>
      <Text style={styles.offlineMsg}>
        কৃষি AI ব্যবহার করতে ইন্টারনেট সংযোগ প্রয়োজন।{'\n'}
        Please connect to the internet and try again.
      </Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>আবার চেষ্টা করুন / Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Check network on mount
  useEffect(() => {
    checkNetwork();
  }, []);

  // Android back button handler
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]);

  const checkNetwork = async () => {
    const state = await Network.getNetworkStateAsync();
    setOffline(!state.isConnected);
  };

  const handleAppReady = useCallback(async () => {
    setAppReady(true);
    await SplashScreen.hideAsync();
  }, []);

  // Handle messages from the web app (native bridge)
  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'GET_LOCATION': {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('KrishiLocation', {
              detail: { lat: ${loc.coords.latitude}, lng: ${loc.coords.longitude} }
            })); true;
          `);
        } else {
          Alert.alert('লোকেশন', 'লোকেশন অ্যাক্সেস অনুমতি দেওয়া হয়নি।');
        }
        break;
      }

      case 'REQUEST_CAMERA': {
        const { status } = await Camera.requestCameraPermissionsAsync();
        webViewRef.current?.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('KrishiCameraPermission', {
            detail: { granted: ${status === 'granted'} }
          })); true;
        `);
        break;
      }

      case 'SECURE_STORE': {
        if (msg.key && msg.value) {
          await SecureStore.setItemAsync(msg.key, String(msg.value));
        }
        break;
      }

      case 'SECURE_GET': {
        const value = await SecureStore.getItemAsync(msg.key);
        webViewRef.current?.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('KrishiSecureData', {
            detail: { key: '${msg.key}', value: ${JSON.stringify(value)} }
          })); true;
        `);
        break;
      }

      case 'SHARE': {
        const { Share } = require('react-native');
        await Share.share({ message: msg.text });
        break;
      }
    }
  }, []);

  const handleNavigationChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    if (!appReady) handleAppReady();
  }, [appReady, handleAppReady]);

  const handleError = useCallback(() => {
    setLoading(false);
    setOffline(true);
  }, []);

  if (offline) {
    return (
      <SafeAreaProvider>
        <OfflineScreen onRetry={() => { setOffline(false); setLoading(true); checkNetwork(); }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ExpoStatusBar style="light" backgroundColor="#0A8A1F" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0A8A1F" />

        <WebView
          ref={webViewRef}
          source={{ uri: WEB_APP_URL }}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={NATIVE_BRIDGE_SCRIPT}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationChange}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          geolocationEnabled={true}
          cacheEnabled={true}
          pullToRefreshEnabled={true}
          // Allow camera and microphone in web content
          allowsAirPlayForMediaPlayback={true}
          originWhitelist={['https://*', 'http://*']}
          userAgent="KrishiAI-Mobile/2.1 (React Native Expo)"
          onShouldStartLoadWithRequest={(request) => {
            // Keep navigation within the app
            return request.url.startsWith('https://') || request.url.startsWith('http://');
          }}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingEmoji}>🌿</Text>
              <Text style={styles.loadingTitle}>কৃষি AI</Text>
              <Text style={styles.loadingSubtitle}>Krishi AI: Smart Agri Ecosystem</Text>
              <ActivityIndicator size="large" color="#0A8A1F" style={{ marginTop: 20 }} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A8A1F',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A8A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    padding: 32,
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  offlineContainer: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  offlineEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 4,
  },
  offlineSubtitle: {
    fontSize: 16,
    color: '#166534',
    marginBottom: 16,
  },
  offlineMsg: {
    fontSize: 14,
    color: '#4b7a56',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  retryBtn: {
    backgroundColor: '#0A8A1F',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
