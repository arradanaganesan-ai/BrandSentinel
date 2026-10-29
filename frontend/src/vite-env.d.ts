/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL of the BrandSentinel backend API, including its
   * version/prefix path, e.g. "https://api.example.com/api".
   *
   * Optional: when unset the client uses the relative "/api" prefix, which is
   * what the Vite dev proxy and the production nginx `/api/` location resolve.
   * Set this only when the frontend is hosted on a different origin from the
   * backend.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
