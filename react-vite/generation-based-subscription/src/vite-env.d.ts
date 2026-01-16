/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_URL?: string;
    // Add other VITE_ prefixed env variables here as needed
  }
}

export {};
