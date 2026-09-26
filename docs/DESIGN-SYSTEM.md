# Warforged Chronicles · dizajn sistem v2

Skenovi služe za tekst i mehanike. Sve igrive komponente imaju novi dizajn. Fotografija ploče i originalni skenovi nisu lica igrivih komponenti.

## Vizuelni jezik

Warcraft inspirisana ratna dvorana, klesani kamen, reljefna bronza, crveni i plavi frakcijski grbovi, pergamentni questovi i oslikane sposobnosti. Cinzel za imena i naslove; Inter za pravila, brojke i kontrole. Fokus je na trenutku aktivacije i odluci igrača. Sva slova i brojke ostaju HTML/SVG; ilustracije ne sadrže tekst.

| Token | Vrijednost | Primjena |
| --- | --- | --- |
| Ink | `#101316` | Pozadina |
| Surface | `#252729` | Paneli |
| Ivory | `#f4e4bf` | Naslovi |
| Gold | `#e2b969` | Izbor i glavna akcija |
| Horde | `#df6654` | Frakcija |
| Alliance | `#77bce8` | Frakcija |
| Energy | `#69bdf1` | Energija i daljinske moći |
| Nature | `#a9cb6a` | Aktivne moći i stvorenja |
| Arcane | `#c79ef0` | Događaji i Overlordi |

Implementacija: `src/campaign/design-system.tsx`, `Art.tsx` i `warcraft.css`, uz zajedničku osnovu `design-system.css`. Živi pregled: **Dizajn sistem** u navigaciji. Tačni imagegen promptovi i putanje svih sedam novih slikovnih datoteka nalaze se u [IMAGEGEN-WARCRAFT.md](IMAGEGEN-WARCRAFT.md).

## Predlošci

`CardFrame` daje isti redoslijed informacija: vrsta/nivo, nova ilustracija ili simbol, ime/klasa/frakcija, trenutak aktivacije i efekat, cijena/nagrada/vrijednosti.

Na njemu su `AbilityCard`, `CharacterCard`, `QuestCard`, `EventCardView`, `CreatureCard` i `OverlordCard`. Oslikani atlas obuhvata 13 stvorenja, razvojnog Overlorda, događaj i plijen; drugi atlas daje 16 ikona klasa, opreme i akcija. SVG isječci čuvaju proporcije ilustracija. Prototipski portreti junaka koriste raniji generirani atlas; likovi iste klase trenutno dijele ilustraciju. To još nisu 16 finalnih individualnih ilustracija.

Mapa koristi novu sliku `public/assets/warcraft/lordaeron.webp` i interaktivni SVG sloj. Imagegen je promijenio slikarski tretman prethodne ilustracije uz zadržavanje rasporeda krajolika. Kretanje čita iz postojećeg grafa, ne iz piksela. Promjena pozadine ne mijenja legalne poteze. Čvorovi imaju naziv i pristup tastaturom; desktop alatna traka ima pretragu regije i centriranje na junaka. Detalji odabrane regije lebde u donjem dijelu mape.

## Kasniji uvoz

```text
Sken / izvorni tekst
  → transkripcija i dokaz izvora
  → identifikacija osnovnog seta + FAQ ispravke
  → strukturirana karta + tipizirani efekti + test primjera
  → provjera podataka
  → Warforged Chronicles renderer
```

Karta čuva `id`, `name`, `description`, `source`, nivo, cijenu, energiju, tip, osobine i `abilities`. Izvor bilježi URL, stranicu/kartu i status `community`, `fixture` ili `verified`. Referentna `image` putanja može ostati radi poređenja; novi renderer je ne koristi kao izgled karte.

Promjena teksta, prevod, FAQ ispravka i cijena ne zahtijevaju novu bitmapu. Tekst se ne crta u sliku. OCR nije dokaz ispravne skripte: treba provjeriti vrijeme, ciljeve, redoslijed, sekundarne sposobnosti i primjer u testu. Nepoznati tekst ostaje otvorena stavka.

## Stanja

Legalnost, izbor, potrošena energija, uklonjene kockice, čekanje igrača i poraz imaju zasebna stanja. Boju dopunjava tekst ili simbol. Duge karte i odluke koriste zasebne panele s pomicanjem. Animacije poštuju `prefers-reduced-motion`.

Preostaju finalne ilustracije likova/Overlorda, ikone specifičnih efekata i provjera dugih originalnih tekstova u postojećem predlošku. Probni tekstovi ne potvrđuju da svaki originalni tekst već ima gotov prikaz i interakciju.

## Desktop kao jedina ciljna platforma

Odluka korisnika: sav dalji UI rad usmjeren je na desktop. Nema zasebnog mobilnog rasporeda. Radna površina drži mapu, akcije, bočni panel likova/questova, karte i tracker u stalnim zonama. Bočni panel se pomiče nezavisno. Na nižim ekranima karte imaju sažet prikaz, a detalji se otvaraju klikom.

Mapa se povlači mišem i povećava točkićem. Kontrole omogućavaju pronalazak regije ili junaka, pregled cijele ploče i proširivanje mape skrivanjem donjeg prostora s kartama. Prečice 1–5 pozivaju dozvoljene akcije; M otvara kampanju, F proširuje mapu. Dok je mapa u fokusu, + / − mijenjaju zoom, 0 prikazuje cijelu ploču, a strelice pomiču pogled. Prečice akcija ne rade dok korisnik unosi tekst ili koristi modalni dijalog.

Raspored je provjeren na 1280 × 800 i 1920 × 1080. Minimalna predviđena širina radne površine je 1180 px.
