# Flags Battle Arena

A browser-based, continuous country-flag elimination stream built with HTML, CSS, JavaScript, and Matter.js. It starts automatically, announces eliminations and winners with browser speech, and keeps starting fresh rounds.

## Run the game

Open `index.html` in a modern browser. Matter.js, the flag images, and the optional web fonts are loaded from online CDNs, so an internet connection is needed for those assets.

## Live-stream mode

- The game automatically starts with all 195 flags bouncing together inside the arena. Countries are spread across the stadium at the start of each round.
- When a flag hits the spinner, it is removed and announced by name. The spinner and remaining flags keep moving during the announcement, while the next elimination is held until the voice finishes.
- Browser speech also announces the winner. A new round starts after the winner's announcement and a short break; the previous champion faces the spinner first so consecutive rounds have different winners.
- Use **VOICE ON/OFF** to control spoken announcements. If the browser blocks speech before interaction, toggle **VOICE OFF**, then **VOICE ON** once to enable it.
- Use **AUTO ROUNDS ON/OFF** to keep the stream running or stop after the current round.
- **PAUSE BATTLE** pauses/resumes the current round. **RESTART ROUND** starts a fresh round immediately.
- Enter a supported two-letter country code such as `IN`, `US`, or `PK` and select **ADD FLAG** to bring an eliminated country back into the current battle.
- The leaderboard tracks surviving flags. A collision with the center spinner eliminates a country; the last flag standing wins.
- Spinner rounds use a fast, steady steel-and-gold serrated cutter rotor that can surge and reverse. Flags launch at higher speeds and keep bouncing within a controlled speed range with high-restitution collisions and gentle changing air currents; the outer stadium has a layered neon rim. Random shields, gravity wells, and speed boosts add short-lived arena effects; flags also have slightly different mass and bounce.
- Search the leaderboard with `/`, click a survivor to track it in the arena, and use **SFX ON/OFF** for collision and suspense audio. The final 10/final 5 modes add a zoom, pulsing arena, and heartbeat.
- The kill feed records elimination rank and power-up events. Winner cards show survival time and hits taken, with confetti on victories.
- The arena and control panels adapt to laptop, tablet, and mobile widths. Page scrolling remains available on small screens without showing a browser scrollbar.
- Select **9:16 STREAM VIEW** for a vertical broadcast layout inspired by the reference Short: compact round/count cards, a large country elimination headline, centered arena, and a live elimination progress bar with a country-flag tracker. Select the close button or press Escape to return to the full controls.
- Optional **YouTube Live chat** controls accept `!spawn XX`, `!boost XX`, and `!shield XX` from viewers. A viewer can issue one recognized command every five seconds. Spawning returns an eliminated country to the current round; boost and shield require that country to still be alive.

Sound effects need a user interaction first, so click a control once before broadcasting. The browser must remain open and awake for an uninterrupted stream. For reliable long-running broadcasts, disable device sleep and use a browser tab with the game in the foreground. Flag images, Matter.js, and optional web fonts require an internet connection.

## Connect YouTube Live chat

The chat connector uses Google's browser OAuth flow and the YouTube Data API v3 with the read-only `youtube.readonly` scope. It never posts messages. Setup is required once for your Google account:

1. In Google Cloud Console, create/select a project, enable **YouTube Data API v3**, and configure the OAuth consent screen.
2. Create an OAuth client ID for a **Web application**. Add the exact origin you will use (for example `http://localhost:8000`) under **Authorized JavaScript origins**. Do not use a `file://` URL.
3. Serve this folder from that origin (for example, run `python -m http.server 8000` in the project folder and open `http://localhost:8000`).
4. Open **YouTube Live chat** in Battle controls. Enter the OAuth client ID and the active live video's URL or ID, then select **CONNECT CHAT** and approve read-only access.
5. Viewers can use `!spawn IN`, `!boost IN`, or `!shield IN` in that video's live chat. The kill feed shows recognized commands and their effects. Select **DISCONNECT** to stop polling and clear the in-memory access token.

The client ID and video ID are saved in this browser's local storage for convenience; the OAuth access token is kept in memory only. If the OAuth app is in testing mode, the Google account must be listed as a test user. YouTube chat access and API quota limits are controlled by Google; API errors appear in the chat status. If Google expires the access token during a long broadcast, reconnect chat from the controls.