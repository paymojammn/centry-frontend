'use client';

import { useEffect } from 'react';

/**
 * Hydration Error Handler
 * 
 * Suppresses hydration warnings caused by browser extensions
 * that modify the DOM (e.g., password managers, ad blockers).
 * 
 * Common attributes injected by extensions:
 * - bis_skin_checked (BitwiseIM)
 * - bis_register (BitwiseIM)
 * - data-lastpass-icon-root (LastPass)
 * - data-dashlane-rid (Dashlane)
 * - __processed_* (various extensions)
 */
export function HydrationErrorHandler() {
  useEffect(() => {
    // Only in development
    if (process.env.NODE_ENV !== 'development') return;

    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      const errorMessage = args[0];
      
      // Suppress hydration warnings from browser extensions
      if (
        typeof errorMessage === 'string' &&
        (
          errorMessage.includes('Hydration failed') ||
          errorMessage.includes('There was an error while hydrating') ||
          errorMessage.includes('Text content does not match server-rendered HTML') ||
          errorMessage.includes('tree hydrated but some attributes')
        ) &&
        (
          errorMessage.includes('bis_skin_checked') ||
          errorMessage.includes('bis_register') ||
          errorMessage.includes('__processed_') ||
          errorMessage.includes('data-lastpass') ||
          errorMessage.includes('data-dashlane')
        )
      ) {
        // Suppress this error - it's caused by browser extensions
        return;
      }
      
      // Log all other errors normally
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
