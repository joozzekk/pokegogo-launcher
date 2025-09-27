/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface global {
  PokeGoGoLogin: class
}
