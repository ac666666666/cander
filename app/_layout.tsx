import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { useAppThemeStore } from '@/hooks/use-app-theme';
import { useFonts } from 'expo-font';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 配置通知处理器，确保前台也能收到通知
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 在 Expo Go 环境下，忽略 expo-notifications 关于远程推送的提示日志
// 这是 Expo SDK 53 之后的行为，仅影响开发调试日志，不影响本地通知的使用
if (Constants?.appOwnership === 'expo') {
  LogBox.ignoreLogs([
    /expo-notifications: Android Push notifications.*Expo Go/i,
    /Android Push notifications.*Expo Go/i,
  ]);
}

export default function RootLayout() {
  const appTheme = useAppThemeStore((s) => s.theme);

  const [fontsLoaded] = useFonts({
    // 使用相对路径，根目录下 assets/fonts/AlimamaAgileVF-Thin.ttf
    AlimamaAgileVF: require('../assets/fonts/AlimamaAgileVF-Thin.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={appTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
