import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "authToken";

export async function saveToken(token) {
  if (!token) {
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
