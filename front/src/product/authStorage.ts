import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthStoragePort } from './authSessionStore';

export function createDefaultAuthStorage(): AuthStoragePort {
  if (Platform.OS === 'web') {
    return createWebAuthStorage();
  }

  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    deleteItem: (key) => SecureStore.deleteItemAsync(key),
  };
}

function createWebAuthStorage(): AuthStoragePort {
  return {
    async getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    async setItem(key, value) {
      globalThis.localStorage?.setItem(key, value);
    },
    async deleteItem(key) {
      globalThis.localStorage?.removeItem(key);
    },
  };
}
