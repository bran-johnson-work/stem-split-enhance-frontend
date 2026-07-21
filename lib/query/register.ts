// Registers the app-wide error type with TanStack Query. By default `error` is
// typed `unknown` everywhere; this augmentation makes it `Error` (our api seam
// always rejects with an Error — see lib/api/fetch), so components read
// `error.message` without a cast. Imported once from lib/query/client's module
// graph so the augmentation is always in scope.

import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: Error;
  }
}
