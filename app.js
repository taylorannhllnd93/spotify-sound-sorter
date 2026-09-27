
"use strict";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_AUTH = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token";
const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private"
].join(" ");

const GENERIC_TAGS = new Set([
  "pop", "female vocalists", "female vocalist", "seen live", "favorites", "favourite",
  "american", "usa", "singer", "songwriter", "spotify", "2020s", "2010s", "2020", "2021",
  "2022", "2023", "2024", "2025", "2026"
]);


const PRESETS = {
  slayyyter: {
    label: "Slayyyter",
    seedArtist: "Slayyyter",
    exclusions: "rap, hip hop, trap, k-pop, kpop, korean pop",
    tags: "hyperpop:38, electroclash:38, electropop:34, electro pop:34, club pop:34, bubblegum bass:30, glitch pop:25, dance pop:22, synthpop:20, synth pop:20, experimental pop:18, alternative pop:15, alt pop:15, dark pop:15, electronic:8, dance:8, pop:2",
    hint: "Hyperpop, electroclash, electropop and club-pop are strongest; generic pop barely counts."
  },
  purepop: {
    label: "Pure Pop",
    seedArtist: "Sabrina Carpenter",
    exclusions: "rap, hip hop, trap, k-pop, kpop, korean pop",
    tags: "dance pop:32, electropop:26, pop rock:22, teen pop:20, power pop:18, synthpop:18, synth pop:18, contemporary pop:18, mainstream pop:16, bubblegum pop:15, pop:4",
    hint: "Broad mainstream pop, but rap/hip-hop, trap and K-pop are hard-excluded."
  },
  girlypop: {
    label: "Girly Pop",
    seedArtist: "Chappell Roan",
    exclusions: "rap, hip hop, trap, k-pop, kpop, korean pop, metal, hardcore",
    tags: "dance pop:34, electropop:30, synthpop:28, synth pop:28, bubblegum pop:26, glitter pop:24, queer pop:22, indie pop:18, alt pop:16, alternative pop:16, pop rock:12, pop:3",
    hint: "Glossy, theatrical, playful pop with dance and synth signals prioritized."
  },
  darkpop: {
    label: "Dark Pop",
    seedArtist: "BANKS",
    exclusions: "k-pop, kpop, korean pop, comedy, novelty",
    tags: "dark pop:40, alternative pop:32, alt pop:32, electropop:28, synthpop:24, synth pop:24, trip hop:22, art pop:20, electronic:18, indie electronic:16, dream pop:14, pop:2",
    hint: "Moody, dramatic pop with dark-electronic and alternative-pop weighting."
  },
  clubpop: {
    label: "Club / Party",
    seedArtist: "Charli xcx",
    exclusions: "acoustic, folk, singer songwriter, k-pop, kpop, korean pop",
    tags: "club pop:40, dance pop:36, electroclash:34, electropop:32, house:28, dance:26, electronic:24, hyperpop:24, eurodance:20, synthpop:18, techno pop:16, pop:2",
    hint: "Prioritizes club-ready dance/electronic pop; acoustic and folk styles are excluded."
  },
  "2000spop": {
    label: "2000s Pop",
    seedArtist: "Britney Spears",
    exclusions: "k-pop, kpop, korean pop, trap, drill",
    tags: "dance pop:34, teen pop:30, y2k:30, 2000s:28, electropop:24, contemporary rnb:16, pop rock:16, euro pop:14, europop:14, bubblegum pop:12, pop:4",
    hint: "Y2K/2000s mainstream pop, dance-pop and teen-pop with a Britney-style seed."
  },
  poppunk: {
    label: "Pop-Punk",
    seedArtist: "Paramore",
    exclusions: "k-pop, kpop, korean pop, trap, hip hop, rap",
    tags: "pop punk:42, power pop:34, alternative rock:28, punk rock:26, emo pop:22, emo:18, pop rock:18, skate punk:14, rock:8, pop:2",
    hint: "Pop-punk and power-pop first, then adjacent alternative/emo/pop-rock."
  },
  custom: {
    label: "Sounds Like…",
    seedArtist: "",
    exclusions: "rap, hip hop, k-pop, kpop, korean pop",
    tags: "pop:2",
    hint: "Enter any seed artist and optionally edit positive tags and exclusions."
  }
};

const state = {
  token: null,
  profile: null,
  playlists: [],
  tracks: [],
  results: [],
  seedTags: [],
  similarArtists: new Map(),
  preset: "slayyyter"
};

const $ = (id) => document.getElementById(id);
const els = {
  settingsBtn: $("settingsBtn"),
  settingsDialog: $("settingsDialog"),
  spotifyClientId: $("spotifyClientId"),
  lastfmApiKey: $("lastfmApiKey"),
  redirectUri: $("redirectUri"),
  saveSettingsBtn: $("saveSettingsBtn"),
  connectBtn: $("connectBtn"),
  connectionText: $("connectionText"),
  profile: $("profile"),
  playlistCard: $("playlistCard"),
  playlistSelect: $("playlistSelect"),
  soundCard: $("soundCard"),
  seedArtist: $("seedArtist"),
  exclusions: $("exclusions"),
  positiveTags: $("positiveTags"),
  presetHint: $("presetHint"),
  analyzeBtn: $("analyzeBtn"),
  progressCard: $("progressCard"),
  progressBar: $("progressBar"),
  progressText: $("progressText"),
  resultsCard: $("resultsCard"),
  summaryText: $("summaryText"),
  resultsList: $("resultsList"),
  bucketFilter: $("bucketFilter"),
  minimumBucket: $("minimumBucket"),
  newPlaylistName: $("newPlaylistName"),
  createFilteredBtn: $("createFilteredBtn"),
  createSortedBtn: $("createSortedBtn"),
  replaceOriginalBtn: $("replaceOriginalBtn"),
  toast: $("toast")
};

function normalizeTag(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/[-_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTrackName(name) {
  return String(name || "")
    .replace(/\s*[\(\[](?:feat\.?|featuring|with)\b.*?[\)\]]/gi, "")
    .replace(/\s*-\s*(?:remaster(?:ed)?|radio edit|single version|album version|explicit version|clean version).*$/gi, "")
    .trim();
}

function settings() {
  return {
    clientId: localStorage.getItem("ss_spotify_client_id") || "",
    lastfmKey: localStorage.getItem("ss_lastfm_key") || "",
    redirectUri: localStorage.getItem("ss_redirect_uri") || defaultRedirectUri()
  };
}

function defaultRedirectUri() {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  return u.toString();
}

function saveSettings() {
  localStorage.setItem("ss_spotify_client_id", els.spotifyClientId.value.trim());
  localStorage.setItem("ss_lastfm_key", els.lastfmApiKey.value.trim());
  localStorage.setItem("ss_redirect_uri", els.redirectUri.value.trim() || defaultRedirectUri());
  showToast("Settings saved");
  els.settingsDialog.close();
  refreshConnectionHint();
}

function loadSettingsIntoUI() {
  const s = settings();
  els.spotifyClientId.value = s.clientId;
  els.lastfmApiKey.value = s.lastfmKey;
  els.redirectUri.value = s.redirectUri;
}

function refreshConnectionHint() {
  const s = settings();
  if (!s.clientId || !s.lastfmKey) {
    els.connectionText.textContent = "Add your Spotify Client ID and Last.fm API key in Settings.";
  } else if (!state.token) {
    els.connectionText.textContent = "Ready to connect.";
  }
}

function showToast(message, ms = 2800) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => els.toast.classList.add("hidden"), ms);
}

function setProgress(done, total, text) {
  const pct = total ? Math.max(0, Math.min(100, (done / total) * 100)) : 0;
  els.progressBar.style.width = `${pct}%`;
  els.progressText.textContent = text || `${done} of ${total}`;
}

function parseWeightedTags(text) {
  const out = new Map();
  for (const part of String(text || "").split(",")) {
    const [rawName, rawWeight] = part.trim().split(":");
    const name = normalizeTag(rawName);
    if (!name) continue;
    const weight = Number(rawWeight);
    out.set(name, Number.isFinite(weight) ? weight : 15);
  }
  return out;
}

function parseExclusions() {
  return els.exclusions.value
    .split(",")
    .map(normalizeTag)
    .filter(Boolean);
}

function phraseMatch(tag, phrase) {
  tag = normalizeTag(tag);
  phrase = normalizeTag(phrase);
  if (!tag || !phrase) return false;
  if (tag === phrase) return true;
  // Match explicit phrase boundaries, not fragments like "trap" in "trapdoor".
  return (` ${tag} `).includes(` ${phrase} `);
}

function hasExcludedTag(tags, exclusions) {
  return tags.some(t => exclusions.some(ex => phraseMatch(t.name, ex)));
}

function classify(score, excluded) {
  if (excluded) return "excluded";
  if (score >= 65) return "strong";
  if (score >= 40) return "similar";
  if (score >= 20) return "adjacent";
  return "weak";
}

function bucketLabel(bucket) {
  return ({
    strong: "Very close",
    similar: "Similar",
    adjacent: "Adjacent",
    weak: "Weak",
    excluded: "Excluded"
  })[bucket] || bucket;
}

function scoreTagList(tags, positives, seedWeights) {
  let score = 0;
  const reasons = [];

  tags.forEach((tagObj, idx) => {
    const tag = normalizeTag(tagObj.name);
    if (!tag) return;
    const rankFactor = Math.max(0.35, 1 - idx * 0.06);

    for (const [wanted, weight] of positives) {
      if (phraseMatch(tag, wanted)) {
        const value = weight * rankFactor;
        score += value;
        if (weight >= 15) reasons.push({ label: tagObj.name, value });
      }
    }

    for (const [wanted, weight] of seedWeights) {
      if (phraseMatch(tag, wanted)) {
        const value = weight * rankFactor;
        score += value;
        if (!GENERIC_TAGS.has(wanted)) reasons.push({ label: tagObj.name, value });
      }
    }
  });

  // Diminishing returns keep a track with 10 redundant pop tags from dominating.
  score = 100 * (1 - Math.exp(-score / 90));
  return { score, reasons };
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64url(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[b % 66]).join("");
}

async function startSpotifyLogin() {
  const s = settings();
  if (!s.clientId || !s.lastfmKey) {
    loadSettingsIntoUI();
    els.settingsDialog.showModal();
    showToast("Add both API keys first");
    return;
  }

  const verifier = randomString(64);
  const challenge = base64url(await sha256(verifier));
  const csrfState = randomString(24);
  sessionStorage.setItem("ss_pkce_verifier", verifier);
  sessionStorage.setItem("ss_oauth_state", csrfState);

  const params = new URLSearchParams({
    client_id: s.clientId,
    response_type: "code",
    redirect_uri: s.redirectUri,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: csrfState,
    show_dialog: "true"
  });

  location.href = `${SPOTIFY_AUTH}?${params.toString()}`;
}

async function handleSpotifyCallback() {
  const url = new URL(location.href);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) {
    showToast(`Spotify authorization: ${error}`, 5000);
    history.replaceState({}, "", settings().redirectUri);
    return;
  }
  if (!code) return;

  const expectedState = sessionStorage.getItem("ss_oauth_state");
  const verifier = sessionStorage.getItem("ss_pkce_verifier");
  if (!expectedState || returnedState !== expectedState || !verifier) {
    showToast("Spotify login state check failed. Please connect again.", 5000);
    history.replaceState({}, "", settings().redirectUri);
    return;
  }

  const s = settings();
  const body = new URLSearchParams({
    client_id: s.clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: s.redirectUri,
    code_verifier: verifier
  });

  const res = await fetch(SPOTIFY_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Spotify token exchange failed");

  saveToken(data);
  sessionStorage.removeItem("ss_pkce_verifier");
  sessionStorage.removeItem("ss_oauth_state");
  history.replaceState({}, "", s.redirectUri);
}

function saveToken(data) {
  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || state.token?.refresh_token || "",
    expires_at: Date.now() + (Number(data.expires_in || 3600) * 1000) - 30000
  };
  state.token = token;
  localStorage.setItem("ss_token", JSON.stringify(token));
}

function loadToken() {
  try {
    const raw = JSON.parse(localStorage.getItem("ss_token") || "null");
    if (raw?.access_token) state.token = raw;
  } catch {}
}

async function refreshSpotifyToken() {
  if (!state.token?.refresh_token) throw new Error("Spotify session expired. Connect again.");
  const s = settings();
  const body = new URLSearchParams({
    client_id: s.clientId,
    grant_type: "refresh_token",
    refresh_token: state.token.refresh_token
  });
  const res = await fetch(SPOTIFY_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Could not refresh Spotify session");
  saveToken(data);
}

async function ensureToken() {
  if (!state.token) throw new Error("Connect Spotify first");
  if (Date.now() >= state.token.expires_at) await refreshSpotifyToken();
}

async function spotify(path, options = {}) {
  await ensureToken();
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${state.token.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    await refreshSpotifyToken();
    return spotify(path, options);
  }

  if (res.status === 429) {
    const wait = Number(res.headers.get("Retry-After") || 2);
    await sleep(wait * 1000);
    return spotify(path, options);
  }

  let data = null;
  if (res.status !== 204) {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error_description || `Spotify API error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function lastfm(method, params = {}, { cacheKey = null } = {}) {
  const s = settings();
  const key = cacheKey ? `ss_lfm_${cacheKey}` : null;

  if (key) {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.t < 1000 * 60 * 60 * 24 * 30) return cached.v;
    } catch {}
  }

  const q = new URLSearchParams({
    method,
    api_key: s.lastfmKey,
    format: "json",
    autocorrect: "1",
    ...params
  });

  let res;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(`${LASTFM_API}?${q.toString()}`);
    if (res.status !== 429) break;
    await sleep(1000 * (attempt + 1));
  }

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.message || `Last.fm error ${res.status}`);
  }

  if (key) {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: data })); } catch {}
  }
  return data;
}

async function loadProfileAndPlaylists() {
  state.profile = await spotify("/me");
  els.profile.textContent = `Connected as ${state.profile.display_name || state.profile.id}`;
  els.profile.classList.remove("hidden");
  els.connectionText.textContent = "Spotify connected.";
  els.connectBtn.textContent = "Reconnect";

  const playlists = [];
  let offset = 0;
  while (true) {
    const page = await spotify(`/me/playlists?limit=50&offset=${offset}`);
    playlists.push(...(page.items || []));
    if (!page.next || !page.items?.length) break;
    offset += page.items.length;
  }
  state.playlists = playlists.filter(p => p && (p.owner?.id === state.profile.id || p.collaborative));

  els.playlistSelect.innerHTML = '<option value="">Choose a playlist…</option>';
  for (const p of state.playlists) {
    const opt = document.createElement("option");
    opt.value = p.id;
    const total = p.items?.total ?? p.tracks?.total ?? "";
    opt.textContent = total === "" ? p.name : `${p.name} (${total})`;
    els.playlistSelect.appendChild(opt);
  }

  els.playlistCard.classList.remove("disabled-section");
  els.soundCard.classList.remove("disabled-section");
}

async function loadPlaylistTracks(playlistId) {
  const tracks = [];
  let offset = 0;
  while (true) {
    const page = await spotify(`/playlists/${encodeURIComponent(playlistId)}/items?limit=50&offset=${offset}`);
    const items = page.items || [];
    for (const row of items) {
      const t = row.track || row.item || row;
      if (!t || t.type === "episode" || !t.uri || !String(t.uri).startsWith("spotify:track:")) continue;
      tracks.push({
        id: t.id,
        uri: t.uri,
        name: t.name,
        cleanName: cleanTrackName(t.name),
        artists: (t.artists || []).map(a => a.name),
        primaryArtist: t.artists?.[0]?.name || "Unknown artist",
        spotifyUrl: t.external_urls?.spotify || null,
        originalIndex: tracks.length
      });
    }
    if (!page.next || !items.length) break;
    offset += items.length;
  }
  return tracks;
}

function tagObjectsFromResponse(data, kind = "track") {
  const raw = kind === "artist"
    ? data?.toptags?.tag
    : data?.toptags?.tag;
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

async function getTrackTags(track) {
  const cacheKey = `track_${encodeURIComponent(track.primaryArtist.toLowerCase())}_${encodeURIComponent(track.cleanName.toLowerCase())}`;
  const data = await lastfm("track.getTopTags", {
    artist: track.primaryArtist,
    track: track.cleanName
  }, { cacheKey });
  return tagObjectsFromResponse(data, "track").slice(0, 20);
}

async function getArtistTags(artist) {
  const cacheKey = `artisttags_${encodeURIComponent(artist.toLowerCase())}`;
  const data = await lastfm("artist.getTopTags", { artist }, { cacheKey });
  return tagObjectsFromResponse(data, "artist").slice(0, 15);
}

async function buildSeedProfile(seedArtist) {
  const seedData = await lastfm("artist.getTopTags", { artist: seedArtist }, {
    cacheKey: `seedtags_${encodeURIComponent(seedArtist.toLowerCase())}`
  });
  const seedTags = tagObjectsFromResponse(seedData, "artist").slice(0, 18);

  const weights = new Map();
  seedTags.forEach((t, i) => {
    const n = normalizeTag(t.name);
    if (!n) return;
    if (GENERIC_TAGS.has(n)) {
      if (n === "pop") weights.set(n, 2);
      return;
    }
    const weight = Math.max(5, 28 - i * 1.25);
    weights.set(n, Math.max(weights.get(n) || 0, weight));
  });

  const simData = await lastfm("artist.getSimilar", { artist: seedArtist, limit: "75" }, {
    cacheKey: `similar_${encodeURIComponent(seedArtist.toLowerCase())}`
  });

  const similar = new Map();
  const list = simData?.similarartists?.artist || [];
  for (const a of Array.isArray(list) ? list : [list]) {
    if (!a?.name) continue;
    similar.set(a.name.toLowerCase(), Math.max(0, Math.min(1, Number(a.match || 0))));
  }
  similar.set(seedArtist.toLowerCase(), 1);

  state.seedTags = seedTags;
  state.similarArtists = similar;
  return { weights, similar };
}

async function analyzeTrack(track, positives, seedProfile, exclusions) {
  let trackTags = [];
  let source = "track";

  try {
    trackTags = await getTrackTags(track);
  } catch (e) {
    console.warn("track tags failed", track.name, e);
  }

  const hardExcluded = trackTags.length ? hasExcludedTag(trackTags, exclusions) : false;

  let tagsForScoring = trackTags;
  if (tagsForScoring.length < 2) {
    source = "artist fallback";
    try { tagsForScoring = await getArtistTags(track.primaryArtist); }
    catch (e) { console.warn("artist tags failed", track.primaryArtist, e); }
  }

  const tagScore = scoreTagList(tagsForScoring, positives, seedProfile.weights);

  let similarityBoost = 0;
  let similarReason = null;
  for (const artist of track.artists) {
    const match = seedProfile.similar.get(artist.toLowerCase());
    if (match != null) {
      const boost = artist.toLowerCase() === els.seedArtist.value.trim().toLowerCase()
        ? 48
        : 36 * Math.pow(match, 0.7);
      if (boost > similarityBoost) {
        similarityBoost = boost;
        similarReason = `${artist} similarity`;
      }
    }
  }

  let penalty = 0;
  if (source === "artist fallback" && hasExcludedTag(tagsForScoring, exclusions)) {
    // Artist-level exclusions are intentionally softer because one artist may make multiple styles.
    penalty = 30;
  }

  let score = Math.max(0, Math.min(100, tagScore.score + similarityBoost - penalty));
  if (hardExcluded) score = 0;

  const reasons = [...tagScore.reasons]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
    .map(r => r.label);
  if (similarReason) reasons.unshift(similarReason);

  return {
    ...track,
    score,
    excluded: hardExcluded,
    bucket: classify(score, hardExcluded),
    tags: tagsForScoring.map(t => t.name).slice(0, 7),
    tagSource: source,
    reasons: Array.from(new Set(reasons)).slice(0, 4)
  };
}

async function analyzePlaylist() {
  const playlistId = els.playlistSelect.value;
  const seedArtist = els.seedArtist.value.trim();
  const s = settings();

  if (!playlistId) return showToast("Choose a playlist first");
  if (!seedArtist) return showToast("Enter a seed artist");
  if (!s.lastfmKey) return showToast("Add a Last.fm API key in Settings");

  els.resultsCard.classList.add("hidden");
  els.progressCard.classList.remove("hidden");
  setProgress(0, 1, "Loading playlist…");

  state.tracks = await loadPlaylistTracks(playlistId);
  if (!state.tracks.length) throw new Error("No Spotify tracks found in this playlist.");

  setProgress(0, state.tracks.length, `Building ${seedArtist} sound profile…`);
  const seedProfile = await buildSeedProfile(seedArtist);
  const positives = parseWeightedTags(els.positiveTags.value);
  const exclusions = parseExclusions();

  const results = new Array(state.tracks.length);
  let nextIndex = 0;
  let done = 0;
  const concurrency = 3;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= state.tracks.length) return;
      const track = state.tracks[i];
      try {
        results[i] = await analyzeTrack(track, positives, seedProfile, exclusions);
      } catch (e) {
        console.warn("analyze failed", track, e);
        results[i] = {
          ...track,
          score: 0,
          excluded: false,
          bucket: "weak",
          tags: [],
          tagSource: "unavailable",
          reasons: []
        };
      }
      done++;
      setProgress(done, state.tracks.length, `Analyzed ${done} of ${state.tracks.length}: ${track.name}`);
      await sleep(80);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  state.results = results.sort((a, b) =>
    Number(b.excluded) - Number(a.excluded) ? Number(a.excluded) - Number(b.excluded) :
    b.score - a.score ||
    a.primaryArtist.localeCompare(b.primaryArtist) ||
    a.name.localeCompare(b.name)
  );

  renderResults();
  els.progressCard.classList.add("hidden");
  els.resultsCard.classList.remove("hidden");

  const p = state.playlists.find(x => x.id === playlistId);
  const baseName = seedArtist ? `${seedArtist}-ish` : "Sound-sorted";
  els.newPlaylistName.value = baseName;
  if (p) els.newPlaylistName.placeholder = `${p.name} — ${baseName}`;
}

function renderResults() {
  const filter = els.bucketFilter.value;
  const counts = { strong: 0, similar: 0, adjacent: 0, weak: 0, excluded: 0 };
  state.results.forEach(r => counts[r.bucket]++);

  els.summaryText.textContent =
    `${state.results.length} tracks · ${counts.strong} very close · ${counts.similar} similar · ` +
    `${counts.adjacent} adjacent · ${counts.excluded} excluded`;

  els.resultsList.innerHTML = "";
  const visible = filter === "all" ? state.results : state.results.filter(r => r.bucket === filter);

  visible.forEach((r, index) => {
    const row = document.createElement("div");
    row.className = "track-row";

    const rank = document.createElement("div");
    rank.className = "rank";
    rank.textContent = String(index + 1);

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "track-name";
    name.textContent = r.name;
    const meta = document.createElement("div");
    meta.className = "track-meta";
    meta.textContent = r.artists.join(", ");
    const tagLine = document.createElement("div");
    tagLine.className = "tag-line";
    tagLine.textContent = r.excluded
      ? `Excluded by track tag · ${r.tags.join(" · ")}`
      : (r.reasons.length ? `Matched: ${r.reasons.join(" · ")}` : `Tags: ${r.tags.join(" · ") || "none found"}`);
    info.append(name, meta, tagLine);

    const pill = document.createElement("div");
    pill.className = "score-pill";
    pill.title = `${bucketLabel(r.bucket)} · tags from ${r.tagSource}`;
    pill.innerHTML = `<span class="score ${r.bucket}"></span>${r.excluded ? "OUT" : Math.round(r.score)}`;

    row.append(rank, info, pill);
    els.resultsList.appendChild(row);
  });
}

function thresholdForBucket(bucket) {
  return ({ strong: 65, similar: 40, adjacent: 20 })[bucket] ?? 40;
}

async function createPlaylist(name, tracks, description) {
  if (!tracks.length) throw new Error("No tracks meet that match level.");
  const created = await spotify("/me/playlists", {
    method: "POST",
    body: JSON.stringify({
      name,
      public: false,
      description: description || "Created with Sound Sorter"
    })
  });

  for (let i = 0; i < tracks.length; i += 100) {
    const uris = tracks.slice(i, i + 100).map(t => t.uri);
    await spotify(`/playlists/${encodeURIComponent(created.id)}/items`, {
      method: "POST",
      body: JSON.stringify({ uris })
    });
  }
  return created;
}

async function createFiltered() {
  const threshold = thresholdForBucket(els.minimumBucket.value);
  const selected = state.results.filter(r => !r.excluded && r.score >= threshold);
  const name = els.newPlaylistName.value.trim() || `${els.seedArtist.value.trim()}-ish`;
  els.createFilteredBtn.disabled = true;
  els.createFilteredBtn.textContent = "Creating…";
  try {
    const created = await createPlaylist(
      name,
      selected,
      `Songs matched to ${els.seedArtist.value.trim()} by Sound Sorter; broad pop alone is not enough.`
    );
    showToast(`Created “${created.name}” with ${selected.length} tracks`, 5000);
  } finally {
    els.createFilteredBtn.disabled = false;
    els.createFilteredBtn.textContent = "Create filtered playlist";
  }
}

async function createSortedCopy() {
  const chosen = state.playlists.find(p => p.id === els.playlistSelect.value);
  const name = `${chosen?.name || "Playlist"} — sound sorted`;
  els.createSortedBtn.disabled = true;
  els.createSortedBtn.textContent = "Creating…";
  try {
    const created = await createPlaylist(
      name,
      state.results,
      `Sorted by similarity to ${els.seedArtist.value.trim()} with excluded styles at the end.`
    );
    showToast(`Created sorted copy with ${state.results.length} tracks`, 5000);
  } finally {
    els.createSortedBtn.disabled = false;
    els.createSortedBtn.textContent = "Create sorted copy of everything";
  }
}

async function replaceOriginalOrder() {
  const playlistId = els.playlistSelect.value;
  if (!playlistId || !state.results.length) return;
  const chosen = state.playlists.find(p => p.id === playlistId);
  const ok = confirm(`Replace the order of “${chosen?.name || "this playlist"}” with the current sound-sort order?`);
  if (!ok) return;

  els.replaceOriginalBtn.disabled = true;
  els.replaceOriginalBtn.textContent = "Replacing…";
  try {
    const uris = state.results.map(t => t.uri);
    // Spotify's replace operation accepts up to 100 URIs. Replace the playlist with the
    // first 100, then append the remaining tracks in order.
    await spotify(`/playlists/${encodeURIComponent(playlistId)}/items`, {
      method: "PUT",
      body: JSON.stringify({ uris: uris.slice(0, 100) })
    });

    for (let i = 100; i < uris.length; i += 100) {
      await spotify(`/playlists/${encodeURIComponent(playlistId)}/items`, {
        method: "POST",
        body: JSON.stringify({ uris: uris.slice(i, i + 100) })
      });
    }
    showToast("Original playlist reordered", 5000);
  } finally {
    els.replaceOriginalBtn.disabled = false;
    els.replaceOriginalBtn.textContent = "Replace original order";
  }
}

function applyPreset(name) {
  const preset = PRESETS[name] || PRESETS.custom;
  state.preset = name;

  document.querySelectorAll(".preset").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.preset === name);
  });

  els.seedArtist.value = preset.seedArtist;
  els.exclusions.value = preset.exclusions;
  els.positiveTags.value = preset.tags;
  if (els.presetHint) els.presetHint.textContent = preset.hint;

  if (name === "custom") {
    els.seedArtist.focus();
    els.newPlaylistName.value = "Sounds-like mix";
  } else {
    els.newPlaylistName.value = `${preset.label} mix`;
  }
}

async function boot() {
  loadSettingsIntoUI();
  refreshConnectionHint();
  loadToken();

  try {
    await handleSpotifyCallback();
  } catch (e) {
    console.error(e);
    showToast(e.message, 6000);
  }

  if (state.token) {
    try {
      await loadProfileAndPlaylists();
    } catch (e) {
      console.error(e);
      localStorage.removeItem("ss_token");
      state.token = null;
      showToast(`Spotify connection needs renewal: ${e.message}`, 6000);
    }
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

els.settingsBtn.addEventListener("click", () => {
  loadSettingsIntoUI();
  els.settingsDialog.showModal();
});
els.saveSettingsBtn.addEventListener("click", saveSettings);
els.connectBtn.addEventListener("click", () => startSpotifyLogin().catch(e => showToast(e.message, 6000)));
els.analyzeBtn.addEventListener("click", () => analyzePlaylist().catch(e => {
  console.error(e);
  els.progressCard.classList.add("hidden");
  showToast(e.message, 7000);
}));
els.seedArtist.addEventListener("input", () => {
  const active = PRESETS[state.preset];
  if (state.preset !== "custom" && active && els.seedArtist.value.trim() !== active.seedArtist) {
    state.preset = "custom";
    document.querySelectorAll(".preset").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === "custom");
    });
    if (els.presetHint) els.presetHint.textContent = PRESETS.custom.hint;
  }
});

els.bucketFilter.addEventListener("change", renderResults);
els.createFilteredBtn.addEventListener("click", () => createFiltered().catch(e => showToast(e.message, 7000)));
els.createSortedBtn.addEventListener("click", () => createSortedCopy().catch(e => showToast(e.message, 7000)));
els.replaceOriginalBtn.addEventListener("click", () => replaceOriginalOrder().catch(e => showToast(e.message, 7000)));
document.querySelectorAll(".preset").forEach(btn => btn.addEventListener("click", () => applyPreset(btn.dataset.preset)));

boot();
