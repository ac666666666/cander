import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      onPress={(ev) => {
        const raw = props.accessibilityLabel ?? '';
        const label = typeof raw === 'string' ? raw.split(',')[0] : '';
        if (label) {
          Speech.speak(`切换到${label}`, { language: 'zh-CN' });
        }
        props.onPress?.(ev);
      }}
    />
  );
}
