Create a new screen component.

Arguments: $ARGUMENTS (screen name, e.g., "Leaderboard" or "SpinHistory")

Create the file at `app/${name}.tsx` (or in appropriate route group) with this structure:

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../src/theme/useTheme';

export default function ${Name}Screen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.content, { padding: spacing.lg }]}>
        <Text style={[typography.title, { color: colors.text.primary }]}>
          ${Name}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
```

Rules:
- Always use useTheme() for colors, spacing, typography
- Never hardcode hex color values
- Use SafeAreaView for top-level container
- Use Icon component wrapper, not direct Ionicons
- Use FlashList for lists with 100+ items
