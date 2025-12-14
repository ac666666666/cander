import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export type SafeAreaThemedViewProps = SafeAreaViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export default function SafeAreaThemedView({ style, lightColor, darkColor, ...props }: SafeAreaThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  return <SafeAreaView style={[{ backgroundColor, flex: 1 }, style]} {...props} />;
}