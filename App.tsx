import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Figtree_400Regular, Figtree_400Regular_Italic, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import { NotesProvider } from './src/store/NotesContext';
import { ClipboardProvider } from './src/store/ClipboardContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ClipboardSheet } from './src/components/ClipboardSheet';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_400Regular_Italic,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Caprasimo_400Regular,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <NotesProvider>
        <ClipboardProvider>
          <StatusBar style="dark" />
          <RootNavigator />
          <ClipboardSheet />
        </ClipboardProvider>
      </NotesProvider>
    </SafeAreaProvider>
  );
}
