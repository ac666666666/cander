import MyIcon from "@/assets/images/my.svg";
import sky from "@/assets/images/sky.png";
import SafeAreaThemedView from "@/components/safe-area-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAppThemeStore } from "@/hooks/use-app-theme";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";

export default function TabTwoScreen() {
  const appTheme = useAppThemeStore((s) => s.theme);
  const palette = Colors[appTheme];

  const contactInfo = [
    { label: "邮箱", value: "2848154284@qq.com" },
    { label: "电话", value: "13184827264" },
  ];

  const mottoes = [
    "心若向阳，无畏悲伤。",
    "虽然眼前漆黑，但心中长明。",
    "科技不应有障碍，爱能跨越一切。",
    "每一个不曾起舞的日子，都是对生命的辜负。",
  ];

  return (
    <SafeAreaThemedView style={styles.container}>
      <ImageBackground
        source={sky}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ opacity: 0.3 }}
        resizeMode="cover"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部标题 */}
        <View style={styles.header}>
          <MyIcon width={60} height={60} />
          <ThemedText type="title" style={styles.pageTitle}>
            关于作者
          </ThemedText>
        </View>

        {/* 开发初衷 */}
        <View
          style={[
            styles.section,
            {
              backgroundColor:
                appTheme === "dark"
                  ? "rgba(31, 36, 41, 0.8)"
                  : "rgba(255, 255, 255, 0.8)",
              borderColor: appTheme === "dark" ? "#2a2f34" : "#e5e7eb",
            },
          ]}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            开发初衷
          </ThemedText>
          <ThemedText style={styles.text}>
            本应用诞生于一个热爱编程、追求极致体验的开发者心中。
          </ThemedText>
          <ThemedText style={[styles.text, { marginTop: 8 }]}>
            愿这微小的光亮，能温暖你的世界。
          </ThemedText>
        </View>

        {/* 联系方式 */}
        <View
          style={[
            styles.section,
            {
              backgroundColor:
                appTheme === "dark"
                  ? "rgba(31, 36, 41, 0.8)"
                  : "rgba(255, 255, 255, 0.8)",
              borderColor: appTheme === "dark" ? "#2a2f34" : "#e5e7eb",
            },
          ]}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            联系我
          </ThemedText>
          {contactInfo.map((item, index) => (
            <View key={index} style={styles.contactItem}>
              <ThemedText style={styles.label}>{item.label}：</ThemedText>
              <ThemedText style={styles.value} selectable>
                {item.value}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* 每日寄语 */}
        <View
          style={[
            styles.section,
            {
              backgroundColor:
                appTheme === "dark"
                  ? "rgba(31, 36, 41, 0.8)"
                  : "rgba(255, 255, 255, 0.8)",
              borderColor: appTheme === "dark" ? "#2a2f34" : "#e5e7eb",
            },
          ]}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            每日寄语
          </ThemedText>
          <View style={styles.mottoContainer}>
            {mottoes.map((motto, index) => (
              <ThemedText key={index} style={styles.mottoText}>
                “ {motto} ”
              </ThemedText>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, gap: 24 },
  header: { alignItems: "center", marginBottom: 10, marginTop: 20 },
  pageTitle: { marginTop: 12, fontSize: 24 },
  section: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { marginBottom: 4, fontSize: 18 },
  text: { lineHeight: 24, fontSize: 16, opacity: 0.9 },
  contactItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "600", opacity: 0.8, width: 60 },
  value: { fontSize: 16 },
  mottoContainer: { gap: 16 },
  mottoText: {
    fontStyle: "italic",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    textAlign: "center",
  },
});
