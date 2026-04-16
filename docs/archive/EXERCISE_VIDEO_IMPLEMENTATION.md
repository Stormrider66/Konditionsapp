# Exercise Video Support

**Status:** Playlist-import integration removed (not used in this project).

## Current behavior

- **Data model**: exercises can optionally store a `videoUrl`.
- **Coach UI**: coach exercise forms allow entering an optional video URL.
- **Athlete UI**: the exercise instructions modal embeds **Vimeo** links and otherwise shows an **“Open video in browser”** button.

## Notes / next improvements (optional)

- **URL validation**: consider validating `videoUrl` on write (allow `http(s)` only, optionally an origin allowlist).
- **Hosting**: if you want first-party hosting later, store videos in **Supabase Storage** and use signed URLs.


