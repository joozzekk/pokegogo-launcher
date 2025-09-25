/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_API_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
