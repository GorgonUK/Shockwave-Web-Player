/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DIRPLAYER_RUNTIME_SOURCE?: 'upstream' | 'local';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
