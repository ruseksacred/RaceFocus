import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Device storage for persisted stores: AsyncStorage on phones, localStorage on the web. */
export const deviceStorage = createJSONStorage(() => AsyncStorage);
