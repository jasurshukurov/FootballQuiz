import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { usePathname } from 'expo-router';

import { canonicalUrl, getRouteSeo, SITE_NAME, SITE_URL } from '@/lib/seo';

/**
 * Pathname-keyed SEO tags, rendered once from the root layout so every
 * statically exported page gets a unique title, description, canonical and
 * social tags (see lib/seo.ts for why this is centralized).
 *
 * Web only: on iOS, mounting expo-router/head activates the ExpoHead
 * (Handoff) module, which throws a visible "add the handoff origin" alert
 * in Release builds when no origin is configured — and Handoff is a
 * feature we don't use.
 */
export default function RouteSeo() {
  const pathname = usePathname() ?? '/';
  const { title, description } = getRouteSeo(pathname);
  const url = canonicalUrl(pathname);

  if (Platform.OS !== 'web') return null;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
    </Head>
  );
}
