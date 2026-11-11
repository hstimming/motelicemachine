# motelicemachine.github.io

## License

The website's code is dedicated to the public domain under CC0 1.0 (see [LICENSE](LICENSE)). The band's logo, photos, and other artwork are not covered by CC0. See [NOTICE.md](NOTICE.md).

### Homepage photo

The original photo is preserved at `assets/brand/motel-night.webp`. The alternate is `assets/brand/motel-night-alternate.webp`. To switch back, change `data-home-photo="alternate"` to `data-home-photo="original"` on the opening `<html>` tag in `index.html`. The photo proportions and original fade settings switch together. This does not change the Blueberry Hill page.

### Practice availability

Approved members can use the **Practice** workspace tab to select 30-minute slots for this week or next week. Weeks run Monday–Sunday in `America/Chicago`; the choices roll forward automatically. Drag a rectangle to select, start on a selected slot to erase, or use arrow keys and Space/Enter. Save each week separately. Heat-map counts include your draft selections; save to share them. The open calendar refreshes other members' availability every minute without replacing your unsaved selections.

The new `practice_availability` table stores one row per member and week. RLS allows approved members to read schedules and change only their own rows. Its schema is documented in `database/practice-availability.sql`; the two migrations have already been applied to the connected project. Existing auth, event, song, voting, and setlist tables are unchanged.

Run calendar checks from the repo root with `node tests/practice-calendar.test.cjs` and `node tests/practice-integration.test.cjs`.
