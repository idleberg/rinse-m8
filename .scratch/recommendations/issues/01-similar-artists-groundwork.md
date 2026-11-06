# 01: Similar artists and recommended shows (groundwork)

**What to build:** a function that takes an artist name, asks Last.fm's `artist.getSimilar` for similar artists and stores the reply in the app. It doesn't know or care where the artist comes from. Callers will usually pass a show title, since that's the real artist, unlike the station name the scrobbler sends.

The reply keeps each similar artist with Last.fm's match value and is cached per artist for 30 days, so asking again within that time doesn't fetch again. An artist Last.fm doesn't know is cached as an empty list, so it isn't asked again. The lookup needs a connected Last.fm account and gives nothing while disconnected. Failures are only logged, like the other Last.fm calls.

On top of the cache, a second function turns an artist into recommended shows. It matches the similar artists against Rinse's shows: a show matches when its title in the show directory, or the display title of one of its episodes, mentions a similar artist as whole words, so "B2B X", "with X", "/w X" and "X & Friend" all match. Text is compared lowercase with punctuation ignored. Names under 3 characters are skipped to avoid false hits. The artist's own show is never recommended. Each matched show scores its best match value plus 0.2 × the genre overlap (Jaccard) with the artist's show, so genres only break ties. Recommendations come best first.

Nothing in the UI calls these yet. Each follow-up ticket adds a caller.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (needs a check against a real Last.fm account: a lookup, a cached repeat, and one while disconnected)

- [ ] Looking up an artist while connected caches its similar artists with their match values
- [ ] Asking again for the same artist within 30 days doesn't fetch again
- [ ] An unknown artist is cached as an empty list
- [ ] Nothing is looked up while disconnected
- [ ] A failed lookup is logged and gives no recommendations
- [x] A similar artist found in a show's title recommends that show
- [x] A similar artist found in an episode's display title ("B2B …", "with …", "/w …") recommends that episode's show
- [x] The artist's own show is never recommended
- [x] Of two shows with equal matches, the one sharing more genres with the artist's show ranks first
- [x] Unit tests cover parsing a reply, the "artist not found" error, both kinds of match, leaving out the artist's show and the genre tiebreak
