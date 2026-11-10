# Multiplayer i Vercel

**Status: online sobe su na holdu po odluci korisnika.** Ne provisionirati Redis niti povezivati postojeće spremište dok korisnik ne nastavi rad na online sobama. Produkcijska lokalna igra i AI botovi ostaju dostupni bez servera.

U v0.3 kontrole i hookovi za online sobe uklonjeni su iz aktivnog interfejsa. Preostali tekst dokumentuje raniji server prototip, koji još koristi razvojni fixture paket. Server nije migriran na skenirani set i ne treba ga uključivati bez te migracije i nove multiplayer provjere.

Klijenti šalju odluke; server izvršava zajednički engine. Nijedan klijent ne šalje novo stanje, rezultate bacanja ili poredak špila.

## API

`GET /api/game?room=CODE` vraća javni lobby. Uz `Authorization: Bearer TOKEN` vraća filtrirano stanje i legalne poteze vlasnika sesije.

`POST /api/game` prihvata strogo validirane zahtjeve `create`, `join`, `configure`, `start`, `command`, `consent`, `tick`. Promjene traže trenutnu reviziju. Naredbe imaju `requestId`; ponovljen isti zahtjev ne troši dodatnu akciju. Konflikt revizije vraća 409 i klijent ponovo učitava stanje.

Soba ima nasumičan kod, a svaki član zaseban nasumičan token. Server čuva samo hash tokena. Browser čuva vlastiti token radi reconnecta i lokalnu listu sačuvanih soba. Povratak na lokalnu partiju odspaja aktivnu sobu, a dugme „Nastavi sobu” omogućava povratak. Trenutno nema korisničkih računa, oporavka izgubljenog tokena, promjene vlasnika nakon početka ili izbacivanja igrača.

Host dodjeljuje slobodna mjesta botovima i pokreće partiju. Čovjek upravlja samo svojim likovima. Izazov sa saveznikom drugog ljudskog vlasnika i razmjena zahtijevaju potvrdu svih uključenih vlasnika; stanje se ne mijenja djelimično dok se čeka.

## Veza uživo

`/api/ws` prima sobu i token u prvoj poruci, a ne URL-u. Veza šalje filtrirane revizije. Trajno stanje ostaje u spremištu. Poll unutar socket funkcije provjerava reviziju svakih 1,5 s, pa radi i kad drugi klijent koristi drugu instancu.

Veza se obnavlja prije isteka životnog vijeka funkcije. Browser se ponovo spaja s odgodom 1–15 s; ako WebSocket nije dostupan, koristi HTTP osvježavanje svake 4 s. Klijent ne pretpostavlja da je lokalna kopija autoritet.

Vercelova [WebSocket podrška za Functions](https://vercel.com/docs/functions/websockets) je beta; `api/ws.ts` izvozi `http.Server`. Maksimalna dužina veze zavisi od funkcije, pa reconnect ostaje obavezan. Provjereno prema službenoj dokumentaciji 26. 9. 2026; partija preko stvarnog Redis servisa još nije testirana.

## Spremište

- Lokalno: `FileStore`, jedan razvojni proces, atomski zapis u `.local-data/rooms/`.
- Testovi: `MemoryStore`, odvojene instance bez dodira korisničkih soba.
- Cloud: `RedisStore` iz `@upstash/redis`, `SET NX` pri kreiranju i Lua compare-and-swap pri promjeni revizije. Aktivna promjena produžava TTL na 30 dana.

`FileStore` nije namijenjen više server procesa. Produkcija ne prelazi tiho na memoriju ili lokalni disk ako nedostaje Redis konfiguracija.

## Deploy

1. Poveži projekt s Vercelom; Vite build i funkcije su u `vercel.json`.
2. Poveži Upstash Redis i postavi `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` za željeno okruženje.
3. Zadrži varijable samo na serveru, bez `VITE_` prefiksa. Predložak je `.env.example`.
4. Omogući odgovarajući Functions/Fluid compute runtime prema aktuelnoj Vercel WebSocket dokumentaciji. Ako socket endpoint nije dostupan, HTTP fallback ostaje funkcionalan.
5. Provjeri sobu iz dva browser profila: pridruživanje, istovremene poteze, refresh, ponovno spajanje i nastavak poslije funkcijskog reconnecta.

Produkcija je objavljena na [lordaeron-tabletop.vercel.app](https://lordaeron-tabletop.vercel.app), povezana s GitHub granom `main`. **Redis još nije povezan i stvarni Redis CAS nije testiran.** Testirana je HTTP + WebSocket komunikacija kroz lokalni server i konkurentni CAS u testnom spremištu. Za cloud partije treba ponoviti provjeru sa pravim servisom.

Server koristi Node 24 i eksplicitne `.js` putanje za ESM importe. `npm run build` uključuje `npm run check:server` s NodeNext rezolucijom, kako bundler ne bi prikrio putanje koje produkcijski Node ne može učitati.

Ograničenja ove verzije: botovi napreduju dok je povezan klijent koji traži njihove poteze; nema background joba kad svi izađu. Socket polling troši Redis operacije. Rate limit je lokalni po instanci, nije globalna zaštita od zloupotrebe. Zapis je ograničen na 20.000 naredbi. Ovo je MVP za partije s pozivnicom, ne kompletna javna platforma s matchmakingom i takmičarskom zaštitom.

## Pregled 10. 11. 2026.

Server je pregledan dok su online sobe na čekanju. Na živom sajtu, bez Redisa, `/api/game` odgovara 503 za oko 1 ms, a `/api/ws` sada odbija vezu sa 503 umjesto da je drži otvorenu 30–35 s. Autorizacija mjesta, entropija tokena, poređenje u konstantnom vremenu, provjera origina, ograničenje veličine tijela i compare-and-swap izdržali su testove.

Popravljeno u ovom prolazu:

- `/api/ws` bez spremišta odbija upgrade (503), neuspjela autentikacija prekida vezu za oko sekunde i kad druga strana ne odgovori na close, upgrade prolazi kroz isti rate limit kao HTTP, a jedan član može držati najviše četiri žive veze.
- Greške klijenta dobijaju 4xx i kad spremište nije podešeno: pogrešna metoda 405, neispravan ili preduboko ugniježđen JSON 400, neispravan kod sobe 400.
- Revizija ima vlastitu granicu (1.000.000). Ranije je dijelila granicu 10.000 s ostalim brojačima, pa bi soba nakon revizije 10.001 odbijala svaki zahtjev iako dozvoljava 20.000 naredbi.

**Otvoreno, riješiti prije uključivanja online soba:**

1. **Sjeme RNG-a se može rekonstruisati.** Sjeme ima 32 bita, generator je xorshift32, a javno stanje (questovi i trgovac na početku) dovoljno je da se sjeme nađe grubom silom za oko dvije minute na četiri jezgre. Ko ga nađe, zna poredak svih špilova i buduća bacanja. Rješenje: tajna od 32 bajta po sobi izvan `State` i izvođenje svakog izvlačenja iz HMAC-SHA256(tajna, brojač).
2. **Kreiranje soba nema globalno ograničenje.** Rate limit je u memoriji jedne instance (300 zahtjeva u minuti po adresi), soba ima oko 7,6 KB i TTL od 30 dana. Treba limit u Redisu sa strogom kvotom za kreiranje i kratak TTL za sobe koje nikad nisu pokrenute.
3. **Polling po vezi.** Svaka veza čita cijelu sobu svakih 1,5 s. Treba jedno čitanje po sobi, ne po vezi.
4. **Razmjena s botom ne traži pristanak.** Vlasnik lika može jednom naredbom uzeti zlato savezničkog bota. Bot treba procijeniti ili odbiti takvu razmjenu.
5. **Prazne razmjene troše revizije.** Razmjena bez predmeta i zlata se prihvata i dodaje reviziju; treba je odbiti.
6. **Redis CAS i Vercel WebSocket** i dalje nisu isprobani na stvarnim servisima.

