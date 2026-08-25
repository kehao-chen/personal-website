/// <reference types="astro/client" />
import type { DitherHandle } from './lib/dither';

declare global {
  interface Window {
    __dither?: DitherHandle;
  }
}

export {};
