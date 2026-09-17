import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Altura do teclado em px (0 quando fechado). No Android edge-to-edge a janela não redimensiona, então empurramos o conteúdo manualmente. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvt = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const a = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const b = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return height;
}
