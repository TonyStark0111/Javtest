# javenglish.cc UI — black & violet (from user's screenshot, 28 Nov 2026)

Changed files (drop-in, same paths in project):
- src/components/Header.tsx
- src/app/globals.css
- src/lib/types.ts (card title format only)

What matches the screenshot:
- Header: pure black. Logo left = "JAV" bold white + "ENGLISH" bold black on orange box.
- Top-right: violet square button (hamburger; becomes a white X when open).
- Search bar: directly under the logo row on mobile (full width), dark input + violet search button on the right. On desktop it sits right of the logo.
- Menu (mobile): full-width panel directly under the search bar.
  - "Home" row = violet gradient, white house icon, bold white.
  - Rows under it, dark #1d1d1d, bold white uppercase, thin separators, in this exact order:
    NEW RELEASES / VIDEOS / CHANNELS / ENGLISH SUBTITLE / (star) ACTRESS / STUDIOS / CATEGORIES
  - Desktop shows the same items as a horizontal dark bar, Home highlighted violet.
- Whole site theme changed from light/amber to black & violet: page background #121212,
  cards have no white box, video titles are bold white, centered, larger (screenshot style),
  1 full-width card per row on phones.
- Card title format changed to javenglish style: "ALDN-538 Eng Sub. A stepmother's first..."
  (was "ALDN-538 - Eng Sub - ...").

Notes:
- ACTRESS and STUDIOS menu items open /search (XJAV has actress/studio pages per name,
  but no index page yet) — every other item goes to its real listing page.
- Violet used: #9d2ce0, gradient #a83df0 -> #7e1bc4. Orange logo box: #ffa200.
