// app/(business)/[businessSlug]/coach/clients/[id]/profile/page.tsx
// Re-export the athlete profile page.
// Next 16 requires Route Segment Config (like `dynamic`) to be declared
// inline in the page source — re-exports are not statically analyzable.
export { default } from '@/app/clients/[id]/profile/page'
export const dynamic = 'force-dynamic'
