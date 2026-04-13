/**
 * Onboarding Screen
 *
 * First-launch 4-slide walkthrough. Shown once; completion is persisted
 * to AsyncStorage so it never appears again after the first run.
 *
 * Flow: slide through → tap "Let's Play!" → AsyncStorage write →
 *       setOnboardingComplete() → _layout.tsx re-renders to tabs.
 */

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../src/theme/useTheme';
import { useUIStore } from '../src/stores/uiSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ONBOARDING_STORAGE_KEY = '@spin_vault/onboarding_complete';

// ─────────────────────────────────────────────────────────────────────────────
// Slide data
// ─────────────────────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    emoji: '🎰',
    title: 'Welcome to\nSpin Vault',
    subtitle:
      'The ultimate free-to-play slot machine experience. No real money — just pure entertainment.',
  },
  {
    id: 'spin',
    emoji: '🎯',
    title: 'Spin to Win',
    subtitle:
      'Choose your bet, hit spin, and watch the reels line up. Land matching symbols to rake in coins.',
  },
  {
    id: 'bonus',
    emoji: '🎁',
    title: 'Daily Bonuses',
    subtitle:
      'Come back every 24 hours to claim free coins. The vault never runs dry for loyal players.',
  },
  {
    id: 'ready',
    emoji: '🏆',
    title: "You're Ready!",
    subtitle:
      'You start with 10,000 free coins. Spin smart, grow your vault, and chase the jackpot.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dot indicator
// ─────────────────────────────────────────────────────────────────────────────

function Dot({ isActive, colors }: { isActive: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  const width = useSharedValue(isActive ? 24 : 8);

  React.useEffect(() => {
    width.value = withSpring(isActive ? 24 : 8, { damping: 15, stiffness: 220 });
  }, [isActive, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: isActive ? colors.gold.primary : colors.border.default,
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide view
// ─────────────────────────────────────────────────────────────────────────────

function SlideView({ slide }: { slide: Slide }) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH, paddingHorizontal: spacing['2xl'] }]}>
      {/* Emoji circle */}
      <View
        style={[
          styles.emojiCircle,
          {
            backgroundColor: colors.gold.light,
            borderRadius: radius.full,
            borderColor: colors.gold.primary,
          },
        ]}
      >
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>

      {/* Title */}
      <Text
        style={{
          ...typography.display,
          color: colors.text.primary,
          fontWeight: '700',
          textAlign: 'center',
          marginTop: spacing.xl,
        }}
      >
        {slide.title}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          ...typography.body,
          color: colors.text.secondary,
          textAlign: 'center',
          marginTop: spacing.md,
          lineHeight: 24,
        }}
      >
        {slide.subtitle}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const setOnboardingComplete = useUIStore((s) => s.setOnboardingComplete);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTapping, setIsTapping] = useState(false);
  const listRef = useRef<FlatList<Slide>>(null);

  const isLast = currentIndex === SLIDES.length - 1;

  // ── Completion ──────────────────────────────────────────────────────────────

  async function finish() {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Non-fatal — proceed anyway; onboarding may replay next launch
    }
    setOnboardingComplete();
    // _layout.tsx re-renders (hasCompletedOnboarding becomes true) → shows tabs
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goNext() {
    if (isTapping) return;

    if (isLast) {
      void finish();
      return;
    }

    // Guard rapid taps: debounce until the scroll animation settles (~400ms)
    setIsTapping(true);
    listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    setTimeout(() => setIsTapping(false), 400);
  }

  // ── Viewability ─────────────────────────────────────────────────────────────

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index !== null && first?.index !== undefined) {
        setCurrentIndex(first.index);
      }
    },
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg.primary }]} edges={['top', 'bottom']}>

      {/* Skip button (hidden on last slide) */}
      <View style={[styles.skipRow, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
        {!isLast && (
          <TouchableOpacity onPress={() => void finish()} activeOpacity={0.7}>
            <Text style={{ ...typography.body, color: colors.text.tertiary }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <FlatList<Slide>
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }: ListRenderItemInfo<Slide>) => <SlideView slide={item} />}
        style={styles.list}
      />

      {/* Dot pagination */}
      <View style={[styles.dotsRow, { paddingVertical: spacing.lg }]}>
        {SLIDES.map((_, i) => (
          <Dot key={i} isActive={i === currentIndex} colors={colors} />
        ))}
      </View>

      {/* Next / Let's Play button */}
      <TouchableOpacity
        onPress={goNext}
        activeOpacity={0.85}
        style={[
          styles.nextBtn,
          {
            backgroundColor: colors.gold.primary,
            borderRadius: radius.lg,
            marginHorizontal: spacing.lg,
            marginBottom: spacing.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        <Text
          style={{
            ...typography.title,
            color: colors.bg.machine,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {isLast ? "Let's Play!" : 'Next'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  skipRow: {
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCircle: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emoji: { fontSize: 56 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: { alignItems: 'center' },
});
