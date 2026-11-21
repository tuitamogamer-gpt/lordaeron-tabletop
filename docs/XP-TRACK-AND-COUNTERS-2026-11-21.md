# Trag iskustva i uspravni brojači · 21. 11. 2026.

Zahtjev: „Sredi experience tracker da bude precizniji i neka tokeni karaktera uvijek budu okrenuti uspravno.”

## Šta je nađeno

### Trag iskustva

- **Trag je bio neprekidna skala bez polja.** Položaj brojača bio je razlomak dužine trake (iskustvo podijeljeno s 28), a na traci su stajale samo četiri oznake: nivoi 2, 3, 4 i 5. Koliko lik ima iskustva i koliko mu fali do nivoa nije se moglo pročitati.
- **Brojači na istom mjestu pomjerani su 13 px nadolje.** Drugi lik s istim iskustvom izgledao je kao da ga ima manje.
- **Brojači su prekrivali oznake nivoa.** Na slici iz partije oznake „2” i „3” bile su iza brojača.
- **Trag je dobijao samo ono što tabla ostavi sa strane.** Na 1440×900 to je bilo 77 px, a sama traka u njima 59 px. Na 1920×1200, 2560×1440 i 1280×1024 traga nije bilo uopšte.
- Kad tabla leži (3D prikaz), brojači na tragu su se krivili zajedno s trakom.

### Brojači likova

- **Svih 16 skeniranih brojača bilo je nakrivljeno, svaki pod drugim uglom.** Na listu žetona leže kako su isječeni, a skripta ih je sve okretala za istih 180°. Burbon i Thundershot su stajali naglavačke, Alissi, Brandon i Leeam na boku. U kodu je pisalo da su uspravni.
- Isti fajl se koristi na mapi, na tragu iskustva i u popisima, pa je lik svuda bio nakrivljen.

## Šta je sada

### Trag iskustva

- **Jedno polje za svaki bod iskustva, od 0 (Start) do 28**, kao na štampanoj tabli. Svako polje nosi svoj broj.
- **Polja koja donose nivo su zelena**: 4, 10, 18 i 28.
- **Lijevo od polja je kolona nivoa.** Broj nivoa stoji u redu u kojem nivo počinje, a linija iznad njega pokazuje dokle taj nivo traje (nivo 3: od 10 do 17).
- **Brojač stoji tačno u visini svog polja**, desno od traga, i s poljem ga veže linija u boji frakcije. Polje na kojem neko stoji ima zlatan okvir.
- **Brojači se više ne pomjeraju po visini.** Kad su na istom ili susjednom polju, stoje jedan pored drugog. Hordini stoje bliže tragu.
- Prelazak mišem kaže sve: „Grumbaz Crowsblood · 13 XP · level 3 · 5 XP to level 4”. Isto dobija i čitač ekrana.
- Kad lik dobije iskustvo, brojač klizi na novo polje.

### Gdje trag stoji

- **Trag je sada dio table**: stoji uz njen lijevi rub, a tabla i trag su zajedno na sredini stola.
- **Vidi se na svakom stolu širem od 860 px.** Na ekranima gdje ga ranije nije bilo, tabla mu ustupa širinu:

| Ekran | Mjesto za trag ranije | Sada | Tabla |
| --- | --- | --- | --- |
| 1280×720 | 128 px | 232 px | ista |
| 1440×900 | 77 px | 166 px | 1,3 % uža |
| 1920×1080 | 182 px | 232 px | ista |
| 1920×1200 | nema ga | 176 px | ista |
| 2560×1440 | nema ga | 176 px | 10,7 % uža |
| 1280×1024 | nema ga | 112 px | 12 % uža |

- Na stolu užem od 860 px (prozor oko 1.000 do 1.200 px, tablet, telefon) traga i dalje nema.
- Širina traga služi brojačima: na početku partije svih šest stoji na Startu, i na 1280×720 svi stanu jedan pored drugog. Na 1920×1080 se prekrivaju za trećinu, a lica se vide.

### Brojači

- **Svaki brojač je okrenut tako da lice stoji kao na portretu lika.** Slika na brojaču je glava s tog portreta, pa je ugao izmjeren: tražen je okret pri kojem se brojač najbolje poklapa s portretom.
- Zamijenjeni su sami fajlovi (`public/assets/scans/counters`), pa je lik uspravan svuda gdje se brojač prikazuje.
- **Gdje je slikar nagnuo glavu, nagnuta je i na brojaču** (Leeam, Sandrai, Sofeea, Wennu). Ako želiš da i te stoje potpuno ravno, to je posebna odluka: tada više ne bi odgovarale portretu.
- Uglovi su upisani u `scripts/prepare-scan-assets.ts`, pa sljedeća priprema skenova daje iste, uspravne brojače.
- **Kad tabla leži, brojači na tragu stoje uspravno i okrugli**, kao figure na mapi. Trag leži s tablom, brojači ne.

Uglovi (u smjeru kazaljke, poslije dotadašnjih 180°):

| Lik | Ugao | Lik | Ugao |
| --- | --- | --- | --- |
| Alissi | 274° | Meadowfrey | 9° |
| Artumnis | 178° | Sandrai | 226° |
| Brandon | 298° | Shailara | 341° |
| Brebo | 107° | Sofeea | 322° |
| Burbon | 241° | Thundershot | 156° |
| Dongon | 310° | Weefla | 68° |
| Grumbaz | 213° | Wennu | 205° |
| Leeam | 236° | Zowka | 309° |

## Šta nije dirano

- Pravila: pragovi nivoa (4, 10, 18, 28) i sve što se tiče iskustva isti su kao prije.
- Žetoni Overlorda, frakcija i pješčani sat. Zahtjev je bio za likove; ostale nisam provjeravao.
- Trag poteza ispod mape.
- Prikaz „Interact with map” (cijeli ekran) i dalje nema trag iskustva.

## Provjera

- **1.714 testova** (bilo ih je 1.695):
  - `tests/counter-upright.test.ts` (17 novih): svaki od 16 brojača poredi se s portretom lika. Mora se poklapati kakav jeste, i lošije kad se okrene za 20°, 90°, 180°, 270° ili 340°. Izmjereno poklapanje je 0,92 do 0,97 za petnaest brojača i 0,86 za Thundershota, čija slika nije na sredini žetona.
  - `tests/board-tracks.test.tsx` (jedan test zamijenjen s tri): 29 polja s brojevima, zelena polja na pragovima, brojač na polju svog iskustva i nikad iznad 28, tekst s iskustvom i bodovima do nivoa, raspored brojača na istom i susjednim poljima.
- `npm run build` i `npm run check:render` prolaze.
- **Uglovi su provjereni dvaput.** Poslije okretanja je mjerenje ponovljeno na novim fajlovima: svih 16 se najbolje poklapa bez daljeg okretanja (jedan na 1°). Svaki sam i pogledao pored isječka portreta.
- **U pregledniku je izmjereno 28 kombinacija**: sedam veličina (1280×720, 1366×768, 1440×900, 1920×1080, 1920×1200, 2560×1440, 1280×1024), početak partije i sredina, položena i ravna tabla. U svakoj:
  - sredina svakog brojača je najviše pola piksela od sredine njegovog polja;
  - brojači su okrugli (širina jednaka visini) i u položenom prikazu;
  - svi su unutar stola i stranica se ne skrola.
- Pogledano na slikama: 1280×720, 1440×900, 1920×1080, 2560×1440 i 1280×1024, položena tabla; 1440×900 i ravna.
- **Nije provjereno:**
  - skripta za skenove nije pokrenuta jer sirovi skenovi nisu u ovom okruženju. Isti koraci okretanja isprobani su na dva brojača i dali su istu sliku kao objavljeni fajlovi;
  - brojači su okrenuti iz objavljenih fajlova od 128 px, pa su neznatno mekši nego što će biti kad se skripta pokrene nad sirovim skenovima;
  - klizanje brojača kad lik dobije iskustvo nisam gledao u pokretu;
  - šest likova na istom polju na stolu od 1280×1024 (trag od 112 px), gdje se najviše prekrivaju.

## Fajlovi

- `src/campaign/BoardTracks.tsx`: novi `ExperienceTrack` i `xpColumns` (ko stoji u kojoj koloni).
- `src/campaign/board-table.css`: trag, njegova širina i mjesto table pored njega.
- `src/campaign/board-3d.css`: položeni trag i uspravni brojači na njemu.
- `src/campaign/scan-assets.css`, `src/campaign/scan-assets.ts`.
- `scripts/prepare-scan-assets.ts`: ugao za svaki brojač.
- `public/assets/scans/counters/`: 16 okrenutih brojača.
