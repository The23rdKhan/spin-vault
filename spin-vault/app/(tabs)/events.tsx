import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '../../src/theme/useTheme';

export default function EventsScreen() {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Text style={[typography.title, { color: colors.text.primary }]}>Events</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
