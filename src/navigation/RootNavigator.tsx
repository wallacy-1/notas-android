import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { navigationRef } from './ref';
import { colors } from '../theme';
import { NotesListScreen } from '../screens/NotesListScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { BackupScreen } from '../screens/BackupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.accent, text: colors.text, card: colors.surface, border: colors.divider },
};

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="Notes" component={NotesListScreen} />
        <Stack.Screen name="Editor" component={EditorScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="Backup" component={BackupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
