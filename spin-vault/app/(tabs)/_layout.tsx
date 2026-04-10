import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import Icon from '../../src/components/Icon';
import { useTheme } from '../../src/theme/useTheme';

type IconName = ComponentProps<typeof Icon>['name'];

type TabIconConfig = {
  filled: IconName;
  outline: IconName;
};

const TAB_ICONS: Record<string, TabIconConfig> = {
  play: { filled: 'game-controller', outline: 'game-controller-outline' },
  shop: { filled: 'cart', outline: 'cart-outline' },
  events: { filled: 'flash', outline: 'flash-outline' },
  profile: { filled: 'person', outline: 'person-outline' },
  settings: { filled: 'settings', outline: 'settings-outline' },
};

export default function TabLayout() {
  const { colors } = useTheme();

  const createTabBarIcon = (tab: keyof typeof TAB_ICONS) => {
    const icons = TAB_ICONS[tab];
    const TabBarIcon = ({ focused, size }: { focused: boolean; size: number }) => (
      <Icon
        name={focused ? icons.filled : icons.outline}
        size={size}
        color={focused ? colors.gold.primary : colors.text.tertiary}
      />
    );
    TabBarIcon.displayName = `TabBarIcon(${tab})`;
    return TabBarIcon;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.bg.card,
          borderTopColor: colors.border.default,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          tabBarIcon: createTabBarIcon('play'),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: createTabBarIcon('shop'),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: createTabBarIcon('events'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: createTabBarIcon('profile'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: createTabBarIcon('settings'),
        }}
      />
    </Tabs>
  );
}
