export const colors = {
  background: { app: "#F8FAFB", surface: "#FFFFFF", subtle: "#F1F5F7" },
  action: {
    primary: "#061D3B",
    primaryHover: "#102F50",
    accent: "#006D66",
    secondary: "#FFFFFF",
  },
  text: {
    primary: "#183047",
    secondary: "#597083",
    tertiary: "#597083",
    onPrimary: "#FFFFFF",
  },
  border: { default: "#D9E3E8" },
  navigation: { activeBackground: "#E6F4F1", activeText: "#075C58" },
  status: {
    activeText: "#075C58",
    activeBackground: "#E6F4F1",
    activeBorder: "#B6DDD5",
  },
} as const;
export type DesignSystemColors = typeof colors;
