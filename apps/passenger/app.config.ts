import type { ConfigContext, ExpoConfig } from 'expo/config';

// Import the token file directly (not the package barrel): this runs in Node at build time.
import { splash } from '../../packages/ui/tokens.ts';

/** app.json holds static config; values that must match design tokens are added here. */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-splash-screen',
      {
        backgroundColor: splash.background,
        image: './assets/images/glyde-logo.png',
        imageWidth: splash.logoWidth,
      },
    ],
  ],
});
