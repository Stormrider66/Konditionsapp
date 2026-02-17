// components/branding/DynamicFontLoader.tsx
// Loads a Google Font dynamically when a business has a custom font configured.
// Renders a <link> tag in the head via Next.js head hoisting.

const GOOGLE_FONT_MAP: Record<string, string> = {
  'Inter': 'Inter:wght@400;500;600;700',
  'DM Sans': 'DM+Sans:wght@400;500;600;700',
  'Roboto': 'Roboto:wght@400;500;700',
  'Poppins': 'Poppins:wght@400;500;600;700',
  'Lato': 'Lato:wght@400;700',
  'Nunito': 'Nunito:wght@400;600;700',
}

interface DynamicFontLoaderProps {
  fontFamily: string
}

export function DynamicFontLoader({ fontFamily }: DynamicFontLoaderProps) {
  const fontParam = GOOGLE_FONT_MAP[fontFamily]
  if (!fontParam) return null

  return (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`}
    />
  )
}
