# Sound Sorter for Spotify

An iPhone-friendly static web app that sorts an owned/collaborative Spotify playlist by *song sound* instead of broad Spotify genre labels.

## Built-in presets

Sound Sorter now includes:

- **Slayyyter** — hyperpop, electroclash, electropop, club-pop
- **Pure Pop** — mainstream pop with rap/hip-hop/K-pop excluded
- **Girly Pop** — glossy, playful dance/synth pop
- **Dark Pop** — moody, dramatic alternative/electronic pop
- **Club / Party** — dance-pop, electro, house, club-oriented tracks
- **2000s Pop** — Y2K, teen-pop, dance-pop
- **Pop-Punk** — pop-punk, power-pop, alt-rock
- **Sounds Like…** — enter any seed artist and customize the tags/exclusions

Each preset combines:
1. weighted Last.fm **track tags**,
2. a seed-artist sound profile,
3. Last.fm similar-artist strength,
4. explicit hard exclusions.

Generic `pop` is intentionally given very little weight, so a song does not rank highly just because it is called pop.

## Privacy

- No Spotify client secret is used or requested.
- Spotify login uses Authorization Code + PKCE.
- Your Spotify Client ID, Last.fm key, and OAuth token are stored in your browser's local storage.
- The app is static: there is no included server collecting your keys or playlists.

## Setup

### 1. Create a Spotify developer app

1. Open the Spotify Developer Dashboard.
2. Create an app and enable Web API.
3. Copy the **Client ID**.
4. Deploy this folder to an HTTPS web host such as GitHub Pages.
5. Open the deployed app.
6. In Sound Sorter > Settings, copy the exact **Redirect URI** shown there.
7. Add that exact URI to the Spotify app's allowed Redirect URIs.
8. Paste your Spotify Client ID into Sound Sorter.

Do **not** put a Spotify client secret into this app.

Spotify currently recommends Authorization Code with PKCE for browser/mobile apps where a client secret cannot be safely stored.

### 2. Create a Last.fm API key

1. Sign into Last.fm.
2. Create/request an API account/key.
3. Paste the API key into Sound Sorter > Settings.

`track.getTopTags`, `artist.getTopTags`, and `artist.getSimilar` do not require Last.fm user authentication; they use the API key.

### 3. Connect and analyze

1. Tap **Connect Spotify**.
2. Choose a playlist you own or collaborate on.
3. Leave the **Slayyyter** preset selected, or switch to Custom.
4. Edit the hard exclusions if desired.
5. Tap **Analyze playlist**.

The first analysis of a large playlist can require many Last.fm lookups. Results are cached in the browser for 30 days, so later analyses are much faster.

## Output options

### Create filtered playlist
Makes a new private Spotify playlist containing only tracks at or above the selected match level.

### Create sorted copy of everything
Makes a new private playlist containing every track, ordered from strongest sound match to weakest; hard-excluded tracks go at the end.

### Replace original playlist order
Overwrites the selected playlist's item order with the preview order. This action is intentionally placed inside a danger section and asks for confirmation.

For playlists over 100 tracks, Sound Sorter replaces the first 100 items, then appends the remaining tracks in 100-item batches to preserve the full sorted order.

## Score logic

The score combines:
1. Track-level Last.fm tags.
2. Slayyyter/custom positive tag weights.
3. Tags learned from the seed artist (generic tags such as `pop` are heavily down-weighted).
4. Last.fm similar-artist strength.
5. Hard exclusion of track-level tags such as rap/hip-hop/K-pop.

Buckets:
- 65–100: Very close
- 40–64: Similar
- 20–39: Adjacent
- 0–19: Weak
- OUT: Hard-excluded

## Important Spotify API notes

As of the 2026 Spotify Web API:
- Playlist item endpoints use `/playlists/{id}/items`.
- Playlist items are accessible only for playlists owned by the current user or playlists where the user is a collaborator.
- Add/replace requests accept up to 100 item URIs per request.
- Spotify's current Web API documentation states that a Premium account is needed to use the Web API.

## iPhone install

Once hosted:
1. Open the app in Safari.
2. Share > **Add to Home Screen**.
3. It opens like a standalone app.

The included `manifest.webmanifest` and service worker provide basic PWA behavior.


## Changing presets

Tap any preset card to load its seed artist, exclusions, and weighted tags.

If you manually change the seed artist after choosing a preset, Sound Sorter automatically switches to **Sounds Like…** mode so the UI reflects that you are now using a custom target.

You can still edit the advanced positive-tag weights for any preset.
