// Create this file: app.d.ts in your root directory
// This extends expo-router types without breaking imports

/// <reference types="expo-router" />

import 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: 
        | '/'
        | '/(auth)'
        | '/(auth)/login'
        | '/(auth)/verify'
        | '/(auth)/vendor-login'
        | '/(auth)/welcome'
        | '/(student)'
        | '/(student)/discount-claimed'
        | '/(student)/history'
        | '/(student)/jazzcash-payment'
        | '/(student)/payment'
        | '/(student)/profile'
        | '/(student)/scanner'
        | '/(student)/subscription'
        | '/(student)/vendors'
        | '/(vendor)'
        | '/(vendor)/analytics'
        | '/(vendor)/index'
        | '/(vendor)/profile'
        | '/(vendor)/qr-code';
      DynamicRoutes: 
        | `/(student)/vendors/${string}`
        | `/(auth)/verify?${string}`
        | `/(student)/payment?${string}`
        | `/(student)/jazzcash-payment?${string}`;
      DynamicRouteTemplate: 
        | '/(student)/vendors/[id]'
        | '/(auth)/verify'
        | '/(student)/payment'
        | '/(student)/jazzcash-payment';
    }
  }
}