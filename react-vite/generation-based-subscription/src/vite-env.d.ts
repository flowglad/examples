/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_URL?: string;
    // Add other VITE_ prefixed env variables here as needed
  }
interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
export {};
