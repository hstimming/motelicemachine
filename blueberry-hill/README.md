# Blueberry Hill ticket page

A standalone page for one show: Motel Ice Machine at Blueberry Hill, St. Louis, Monday, December 7, 2026, 9 PM.

Address once it's merged: https://hstimming.github.io/motelicemachine/blueberry-hill/

Visitors arrive at a dark security-camera view of the motel, walk up to the ice machine, open its door, and find a guest registration card with the show details and the ticket button.

## It's separate from the main site

- It lives in its own folder and loads nothing from the main site: no `app.js`, `config.js`, `styles.css`, Supabase, or login.
- It contains no keys of any kind.
- Removing this folder removes the page. Nothing else changes.

## Turning on the ticket button

1. Open `blueberry-hill/ticket-link.js`.
2. Paste the Partiful event link between the quotes.
3. Save it on a branch and open a pull request.

Until then the button stays disabled and says "Tickets coming soon". Only real-looking `https://partiful.com/e/...` links turn it on. Empty values, placeholders, and links to any other site keep it disabled.

## Pointing the main site here

After this page is live, a band member edits the Blueberry Hill show in the Events Manager and sets its ticket link to the address above. No code change is needed. Other shows keep their own links.

## Accessibility

- "Skip to tickets" is always visible at the top.
- Works with touch, mouse, and keyboard (Tab, Enter, and the Up and Down arrow keys).
- If the visitor's device asks for reduced motion, or they press "Reduce motion" on the page, nothing moves or flickers.
- The flicker is slow and shallow, and the page never flashes. There is no sound.
- Without JavaScript, the page shows the poster and the card with all the show details.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page. Its styles and script are inside it. |
| `ticket-link.js` | The Partiful link (one line). |
| `assets/motel-night.webp` | The motel photo, enlarged 4x from the band's poster file. |
| `assets/lettering.svg` | The poster's MOTEL ICE MACHINE lettering as vector shapes. |
| `assets/share-card.jpg` | The picture shown when someone shares the link. |
| `assets/poster-title.woff2`, `assets/vt323.woff2` | Fonts, under the SIL Open Font License (see `assets/OFL.txt`). |

## Artwork

The motel photo and the logo lettering are band artwork. They are not covered by the CC0 dedication in the repository's `LICENSE` file. A separate pull request will add a note to the license that says so and names their owners.

## Preview on your own computer

From the repository folder, run `python3 -m http.server 8000`, then open http://localhost:8000/blueberry-hill/
