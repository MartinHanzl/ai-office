# Brief: kancelář BlueGhost jako pixel-art scéna

Podklad pro další kroky (layout a kreslení) redesignu kanceláře v aplikaci ai-office. Cíl autora: **„BlueGhost musí být poznat na první pohled“**, kompromisy jsou v pořádku. Scéna: jedna statická „domečková“ scéna 320×180 logických px (16:9), zadní stěna s okny nahoře, podlaha pod ní, bez perspektivy, jen obdélníky, paleta ~40 barev, postavy cca 8×16 px, chůze po mřížce 4×4 px. Zobrazuje se (nejspíš) jen horní patro, 12 pracovišť, ředitel s tabulí úkolů sídlí v zasedačce horního patra.

**Zdroje**
- Článek: „Staré dobré místo, nový duch. BlueGhost vyladil kanceláře k dokonalosti“, Tereza Rýparová, 14. 10. 2025, https://www.blueghost.cz/clanek/stare-dobre-misto-novy-duch-blueghost-vyladil-kancelare-k-dokonalosti/
- Branding: https://www.blueghost.cz/ (logo SVG, CSS proměnné barev, OG obrázek, týmová fotka).

**Referenční adresář** `/Users/jenda/ai-office-ref/blueghost-office/` (mimo repo, jen data):
- `01-…05-*.jpg` – všech 5 fotek z článku (článek jich víc nemá; žádná lazy galerie, větší varianty na serveru nejsou, použité jsou největší dostupné: 800×450, 800×600, 800×1066).
- `06-supplement-homepage-team-courtyard-exterior.jpg` – doplňková týmová fotka z homepage (není z článku, nedatovaná, zřejmě starší než rekonstrukce).
- `detail-crops/` – zvětšené výřezy detailů (duch na stěně, skleněná podlaha, zubatý koberec, okno, schodiště, kóje, stoly…), jména začínají číslem zdrojové fotky.
- `article.html`, `article.txt` (plný text článku), `homepage.html`, `brand-variables.css` (barvy webu).
- Logo: `logo-blueghost-top.svg` (originál, bílé), `logo-blueghost-wordmark-on-0290BF.png` (tak, jak je v hlavičce webu), `logo-blueghost-wordmark-on-00303F.png`, `logo-og-ghost-on-blue-clouds.png` (duch 1200×628), `logo-apple-touch-icon.png` (duch 180×180), `logo-safari-pinned-tab.svg`.

Konvence v textu: **[viděno]** = je na fotce / v textu článku; **[odhad]** = můj úsudek, nutno ověřit.

---

## 1. Shrnutí

BlueGhost (Modrý duch) zůstal na své adrese v ulici Českomalínská v Praze a během plného provozu kanceláře kompletně zrekonstruoval: elektroinstalace, výmalba, osvětlení, koberce, nábytek a úpravy dispozic (zbourala se příčka). Vznikly flexibilní zóny s pravidly pro HOT a FIX místa, kóje na online hovory, tiché budky, zasedací místnost a chill-out zóna; vyměnily se monitory, stoly (polohovací) a židle, přibyly centrální koše na tříděný odpad, rekuperace a chytré osvětlení. Prostor je dvoupodlažní: **horní patro** („office patro“, podle článku „tichá zóna pro soustředěnou práci“) je velký bílý open space s galerií a otvorem do přízemí, **přízemí** má vstupní halu s ocelovým schodištěm nahoru. Styl je „loft / industriál ve světlých barvách“: bílé omítky a stropní trámy se světlíky, surové betonové sloupy, viditelné černé kabely vedené po zdech, antracitový koberec, krémové sedačky, „pavoučí“ lustry s holými žárovkami, tmavě hnědá dřevěná okna s popínavými rostlinami. Nálada je světlá, klidná, teple nasvícená (LED pás na zadní stěně, žárovky), s jedním hravým akcentem: velkým bílým duchem (logem firmy) namalovaným na béžovošedé stěně. Firemní modrá se v interiéru na fotkách **nevyskytuje** – je jen v logu, na webu a na venkovních bannerech. Zrekonstruovaná byla i stávající **klubovna** (nová výmalba, světla), která slouží jako kavárenský kout na kávu, čaj, pauzy a neformální práci s hudbou.

---

## 2. Patra a zóny

### Horní patro („office patro“) – to, co aplikace ukáže
| Zóna | Co v ní je | Zdroj |
|---|---|---|
| Open space s pracovišti | bílé polohovací stoly na bílých podnožích, sestavené do bloků (bench) s béžovošedými prošívanými akustickými paravány, černé monitory (1–2 na stůl), černé kancelářské židle s vysokým opěradlem; zadní stěna z vysokých matně bílých panelů s teplým LED pásem nahoře | [viděno] foto 01, 02, 04 |
| Chill-out zóna | krémové/světle šedé látkové sedačky (trojsedák, L-sedačka, křeslo), béžovo-hnědé křeslo, kulatý dřevěný stolek na třech nohách, bílé mobilní stolky na notebook (tvar C), skleněný panel v podlaze, světlý koberec se „zubatým“ okrajem do tmavého koberce, nad tím 4–5 „pavoučích“ lustrů | [viděno] foto 01, 03, 04 |
| Stěna s duchem | béžovošedá (taupe) stěna u chill-outu, na ní velký bílý duch – logo BlueGhost | [viděno] foto 01 |
| Galerie a otvor do přízemí | obdélníkový otvor v podlaze s tmavě šedým ocelovým zábradlím, průhled dolů do vstupní haly; u něj horní konec ocelového schodiště | [viděno] foto 02, 03 |
| Okna | hluboká ostění v silné bílé zdi, dvoukřídlá okna s tmavě hnědým dřevěným rámem a příčkami, květináče s převislými rostlinami na parapetu, venku zeleň/břečťan | [viděno] foto 02, 03 |
| Prosklené místnosti se závěsy | skleněné stěny, světle tyrkysově-zelené průsvitné závěsy, uvnitř bílá pyramidová akustická pěna; vedle chill-outu | [viděno] foto 01 (tmavý závěs vlevo), 03 (vlevo). Že jde o **kóje na hovory / tiché budky** je [odhad]; může jít i o zasedačku |
| Zasedací místnost | článek ji jmenuje mezi novinkami, na fotkách ji **jednoznačně identifikovat nelze** | [viděno] text; poloha [neznámá] |
| Prosklené dveře s černým rámem | otevřené dveře s černým rámem a klikou na bílé stěně vedle ducha, za nimi hasicí přístroj | [viděno] foto 01; kam vedou, nevím |
| Konstrukce | 2+ surové betonové sloupy, bílé trámy, obdélníkové světlíky ve stropě, svazky černých kabelů s příchytkami po zdech a stropě, hasicí přístroje | [viděno] všechny fotky |

### Přízemí
| Zóna | Co v ní je | Zdroj |
|---|---|---|
| Vstupní hala | světlá (bílo-šedá) hladká podlaha, bílé zdi, antracitové dveře a zárubně, dvoukřídlé prosklené dveře na dvůr (dlažba) s nadsvětlíkem, ocelové antracitové schodiště s otevřenými stupni nahoru, betonový sloup, hydrant a hasicí přístroj, malé okno s rostlinami | [viděno] foto 05 |
| Bar pod galerií | bílé barové židle (kulatý sedák, chromová noha) u zdi pod otvorem | [viděno] foto 02 (průhled dolů) |
| Místnost s dubovou podlahou | z haly průchod do místnosti se světlou dřevěnou podlahou a dřevěným nábytkem | [viděno] foto 03, 05 (průhledy) |
| Klubovna (káva, čaj, pauza, práce s hudbou) | patro článek **neuvádí**; místnost s dřevěnou podlahou nebo bar v přízemí jsou nejpravděpodobnější kandidáti | [odhad] |
| Rezervované zasedačky pro větší jednání s klienty | článek je zmiňuje v množném čísle, bez polohy | [viděno] text, poloha [neznámá] |

### Co na žádné fotce není
Kuchyňka, kávovar, recepce, televize, kopírka/tiskárna, automat, hodiny, portréty, tabule (whiteboard), firemní modrá v interiéru, nápis „BlueGhost“ uvnitř.

### Co to znamená pro aplikaci (doporučení)
- **Ukázat jen horní patro.** Tam je vše poznávací (duch, chill-out, lustry, galerie se zábradlím, okna s rostlinami, open space). Přízemí do scény přenést jen jako **průhled otvorem v podlaze** (světlá podlaha + kousek dubové podlahy dole) a jako **schodiště = vchod**.
- **Káva:** klubovna je pravděpodobně dole, takže nahoru dát malý **kávový pult** (kompromis, „výběžek klubovny“) u schodiště. Alternativa: kávovar na skříňce u galerie.
- **Recepce:** nahoře žádná není. Doporučuji ji sloučit s kávovým pultem (barový pult s kávovarem = „recepce-like counter“), nebo z ní udělat nízkou skříňku Office & HR u schodiště.
- **TV:** na fotkách není; je nutné ji doplnit (velká obrazovka na pojízdném stojanu nebo na nízké skříňce proti sedačce). Je to vymyšlený prvek, držet ho nenápadný (černý rám).
- **Automat:** zrušit, nebo nahradit **centrálními koši na tříděný odpad** (článek je výslovně zmiňuje, foto 02 ukazuje modrý koš).

---

## 3. Fotky

### `01-hero-upper-floor-lounge-ghost-wall.jpg` (800×450, úvodní foto článku)
- **Co:** horní patro, chill-out zóna. Pohled z rohu u stěny s duchem šikmo do open spacu.
- **Popředí:** krémový trojsedák s vodorovně prošívaným opěradlem (vlevo, zády k nám), béžovo-hnědé čalouněné křeslo (vpravo dole, tmavší než ostatní), bílý mobilní stolek tvaru C s držákem na hrnek, **skleněný panel v podlaze** (obdélník se zelenkavým sklem, je vidět podlaha přízemí), kulatý dřevěný stolek na třech nohách se skleněnou miskou.
- **Střed:** bílé křeslo, bílý trojsedák, druhý mobilní stolek, dva **surové betonové sloupy** (vlevo). Strop bílý s trámy a světlíkem, **3–4 „pavoučí“ lustry** (černý talíř u stropu, 8–12 černých kabelů v obloucích, holé žárovky).
- **Vpravo:** bílá stěna se **svazky černých kabelů** (vodorovně pod stropem, svislé svody k vypínačům), otevřené **dveře s černým rámem** (za nimi hasicí přístroj a člověk u zábradlí), pak **béžovošedá stěna s velkým bílým duchem** (cca 1,5 m vysoký, dvě tmavé oválné oči, rozpažené ruce s vlnitými rukávy, vlnitý spodní lem; je to zrcadlově otočený duch z loga).
- **Pozadí:** open space, cca **6–8 viditelných pracovišť**: bílé stoly, světle šedé prošívané paravány s kulatými samolepkami, černé monitory a židle, člověk ve žlutém svetru. Zadní stěna z vysokých matně bílých panelů.
- **Vlevo u okraje:** tmavě tyrkysový závěs (prosklená kóje). Na podlaze vlevo dole bílé trojúhelníky na tmavém koberci (zubatý přechod koberců).
- **Lidé:** 2. **Světlo:** denní ze světlíků + teplé žárovky.
- **Reprodukovat:** (1) duch na taupe stěně, (2) pavoučí lustry, (3) skleněný panel v podlaze.
- Výřezy: `detail-crops/01-ghost-wall.jpg`, `01-back-wall-desks.jpg`, `01-glass-floor.jpg`, `01-black-door.jpg`, `01-left-curtain.jpg`, `01-zigzag-carpet.jpg`.

### `02-renovation-upper-floor-gallery-railing-desks.jpg` (800×600, „Vzali jsme to opravdu od podlahy!“, během rekonstrukce)
- **Co:** horní patro během prací. Pohled z galerie přes **otvor v podlaze s tmavě šedým ocelovým zábradlím** (sloupky + 2 vodorovná madla) do open spacu.
- **Nábytek:** vlevo bílý stůl s černým monitorem a bílým prošívaným paravánem, **modrý koš na tříděný odpad**, krabice; vzadu vlevo cca 8 černých židlí s vysokým opěradlem shrnutých u zdi; uprostřed a vpravo bloky bílých stolů na bílých podnožích se 4+ černými monitory, převrácená podnož stolu, muž v bílém tričku. Celkem cca **8–10 pracovních míst**.
- **Stav:** koberec částečně stržený (zbytky lepidla), vzadu bourání příčky, žebřík, betonové sloupy.
- **Vpravo:** silná bílá zeď s **tmavě hnědým dřevěným oknem** (dvě křídla, příčky, mosazná klika), bílé květináče s **převislou popínavou rostlinou**, závěsné světlo se 4 žárovkami na černé liště.
- **Strop:** bílé trámy, světlík, černé kabely.
- **Dole v otvoru:** světlá podlaha přízemí, bílé barové židle, antracitové dveře, kus dubové podlahy.
- **Reprodukovat:** (1) otvor v podlaze se zábradlím a průhledem dolů, (2) okno s převislou rostlinou.
- Výřezy: `detail-crops/02-desks.jpg`, `02-void-below.jpg`, `02-window.jpg`.

### `03-new-office-floor-gallery-void-window-plant.jpg` (800×1066, „Nové office patro“)
- **Co:** horní patro po rekonstrukci. Pohled z galerie u horního konce schodiště podél zábradlí k chill-outu a open spacu.
- **Popředí:** antracitový koberec, šedé ocelové zábradlí kolem otvoru, vpravo dole šedý ocelový plech (horní podesta schodiště).
- **Vpravo:** bílá zeď se **dvěma řadami černých kabelů s příchytkami** a svislými svody, zapuštěné **okno s hnědým rámem**, z parapetu **visí rostlina dolů po zdi**, závěs se 4 žárovkami na černé liště; níž v otvoru okno přízemí s rostlinou.
- **Střed:** krémová L-sedačka zády k zábradlí, bílé křeslo, betonové sloupy, pavoučí lustry, **zubatý přechod světlého a tmavého koberce**.
- **Vlevo:** **prosklené místnosti se světle tyrkysovými průsvitnými závěsy**, uvnitř bílá pyramidová akustická pěna (kóje / tiché budky [odhad]).
- **Pozadí:** stoly s černými židlemi a béžovými paravány, zadní stěna z matně bílých panelů s **teplým LED pásem nahoře**, hasicí přístroj.
- **Dole v otvoru:** dubová podlaha, antracitová stěna, muž.
- **Reprodukovat:** (1) zubatý okraj koberce, (2) okno + převislá rostlina + kabely na bílé zdi.
- Výřezy: `detail-crops/03-back-lounge-glass.jpg`, `03-void-lower-floor.jpg`, `03-window.jpg`, `03-zigzag-carpet.jpg`, `03-left-booth-glass.jpg`.

### `04-chillout-zone-sofas-spider-lamps-desks.jpg` (800×1066, „Nová chillout zóna“)
- **Co:** horní patro, chill-out zóna. Pohled ze středu zóny k open spacu.
- **Popředí:** krémová rohová sedačka (vpravo), dva bílé mobilní stolky, **skleněný panel v podlaze** (cca 1×1 m, zelenkavé sklo), černý kbelík (zřejmě pozůstatek prací), světle šedý koberec, malá tmavá rohožka.
- **Střed:** krémový trojsedák (vlevo), kulatý dřevěný stolek, bílé křeslo, **4 pavoučí lustry** (cca 10 žárovek každý), světlík, 2 betonové sloupy vpravo, červený hasicí přístroj na bílé zdi vlevo, černé kabely.
- **Pozadí:** open space, cca **8–10 pracovišť ve 3 skupinách**: bílé stoly, béžovošedé prošívané paravány (asi 1,2 m vysoké, na čele bloků), 1–2 černé monitory na stůl, černé síťové židle s vysokým opěradlem, 2–3 lidé. Vlevo před stoly zábradlí (okraj otvoru). Zadní stěna z matně bílých panelů s teplou LED linkou nahoře.
- **Reprodukovat:** (1) sestava sedaček s kulatým dřevěným stolkem, (2) bílé stoly s béžovými paravány a teplá linka na zadní stěně.
- Výřezy: `detail-crops/04-desks-backwall.jpg`, `04-glass-floor.jpg`.

### `05-opening-party-ground-floor-entrance-staircase.jpg` (800×450, „Slavnostní otevření“)
- **Co:** přízemí, vstupní hala při slavnostním otevření, asi 16 lidí se skleničkami.
- **Prostor:** bílé zdi, světlá hladká podlaha, **antracitové dveře a zárubně** (vlevo), průchod do místnosti se **světlou dubovou podlahou** (červený předmět uvnitř), dvoukřídlé prosklené dveře s antracitovým rámem otevřené na dvůr (dlažba, červené auto), rohožka, nadsvětlík. Hasicí přístroj a hydrant u dveří.
- **Vpravo:** **antracitové ocelové schodiště s otevřenými stupni** a šedým kulatým madlem (uvázaná světle modrá stuha, nejspíš od přestřihávání pásky) vede na horní patro; malé okno s rostlinami nad schody, shora visí popínavá rostlina; surový betonový sloup s patinou na pravém okraji; tmavý ocelový nosník pod stropem; světlík; svazky černých kabelů.
- **Dole:** bílý kulatý stolek s hrnky, pokojová rostlina.
- **Reprodukovat:** (1) antracitové schodiště s otevřenými stupni (vchod v aplikaci), (2) antracitové zárubně/dveře.
- Výřezy: `detail-crops/05-doorways.jpg`, `05-staircase.jpg`.

### `06-supplement-homepage-team-courtyard-exterior.jpg` (1920×1000, NE z článku; z homepage, nedatováno, zřejmě před rekonstrukcí)
- **Co:** exteriér, dvůr s dlažbou, cca 25 lidí z týmu.
- **Budova:** krémová hrubá fasáda, břečťan, **dva svislé modré bannery** (nahoře bílý mrak, dole bílé „BlueGhost“ + duch), nafukovací bílí duchové s modrýma očima, venkovní černé ocelové schodiště s rezavě červeným nosníkem, vstup s tmavými dveřmi a nadsvětlíkem z luxfer (tytéž dveře jako na foto 05).
- **Reprodukovat:** (1) výhled z oken = dvůr s břečťanem a krémovou zdí, (2) modrý banner s logem jako značka na zdi.
- Výřez: `detail-crops/06-banners-entrance.jpg`.

### Logo (homepage)
- **Tvar:** slovní značka „BlueGhost“ (velké B a G, zaoblený geometrický bezpatkový font, tučný, bez mezery) s ® za „t“ a vpravo od ní **značka ducha**: bílá silueta, kulatá hlava, dvě oválné oči (výřezy, je přes ně vidět podklad), ruce rozpažené nahoru s vlnitými „rukávy“, tělo se zužuje do zahnutého vlnitého ocasu. Ve slovní značce letí duch doprava a nahoru (ocas vlevo dole); v OG obrázku a na stěně v kanceláři je zrcadlově (oči vlevo, ocas vpravo dole).
- **Barvy:** logo je jednobarevné bílé (`fill:#FFFFFF`) a na webu stojí na hlavičce barvy `#0290BF`; OG obrázek má bílého ducha na přechodu `#33BBCF` → `#0290BF` s mraky; ikona aplikace má bílého ducha na přechodu cca `#1D92BD` → `#2FADC4`.

---

## 4. Poznávací prvky (od nejpoznatelnějšího)

1. **Velký bílý duch na béžovošedé stěně.** Je to logo i maskot a jediný „firemní“ prvek interiéru; kdo BlueGhost zná, pozná ho okamžitě. *Render:* na zadní stěně panel taupe `#a8957a` cca 28–34 px široký, na něm bílý duch `#f4f1ea` cca 18×22 px: zaoblená hlava 8–10 px, 2 oči 1×2 px tmavé, ruce jako výstupky 3–4 px do stran s 1px zoubky, spodní lem 3 vlnky. Nepřekrývat ho nábytkem vyšším než pár px.
2. **Pavoučí lustry s holými žárovkami.** Nejvýraznější světelný prvek fotek (4–5 kusů nad chill-outem). *Render:* od horního okraje scény černé 1px čáry různé délky (6–20 px), některé lomené do oblouku, na konci 1–2 px teplá žárovka `#ffd27a` (v noci se slabou září `#f6e3c0`), u stropu černý „talíř“ 3–5 px. 2–3 kusy nad sedačkami.
3. **Chill-out: krémové sedačky na světlém koberci se zubatým okrajem.** Kombinace bílých sedaček, světlého ostrůvku koberce a tmavého antracitu kolem je ze všech fotek. *Render:* podlaha `#45444a`, pod chill-outem `#d2cfc8`, hrana jako schody/zuby 2–4 px; sedačky `#e6e1d7` se stínem `#cdc6b8`, jedno křeslo béžovo-hnědé `#b8a993`, kulatý stolek `#b08a5e` 4–5 px.
4. **Otvor v podlaze se šedým ocelovým zábradlím + antracitové schodiště.** Typická dispozice dvoupodlažního loftu, zároveň vchod. *Render:* tmavý obdélník otvoru s kouskem světlé podlahy (`#c9c6bd`) a dubu (`#b08a5e`) dole, kolem 1px zábradlí `#4a4c52` (madlo + sloupky po 6–8 px); schody jako šikmé stupně `#5c6066` s mezerami (otevřené stupně), postavy z nich vystupují.
5. **Surové betonové sloupy.** Dva šedé sloupy uprostřed bílého prostoru jsou na 4 z 5 fotek. *Render:* sloupy 4–6 px široké od podlahy po strop, `#9a968d` s nepravidelnými skvrnami `#7d7a72`/`#b0aca3`.
6. **Bílé zdi s černými kabely ve svazcích.** Industriální detail, který se táhne celou kanceláří. *Render:* 2 rovnoběžné 1px čáry `#141618` pod horním okrajem zadní stěny, každých 6–8 px tmavší tečka (příchytka), občas svislý svod dolů k vypínači (2×2 px bílý).
7. **Tmavě hnědá dřevěná okna v hlubokém ostění s převislou rostlinou.** Jediná okna horního patra na fotkách; zeleň za nimi i na parapetu. *Render:* okno cca 12×18 px, rám `#3a2418`, 1 svislá a 2 vodorovné příčky, světlé ostění 1–2 px kolem; na parapetu bílý květináč 3 px a zelené pixely `#4f7a3a`/`#2f5229` visící 6–15 px po zdi. Za sklem obloha + zeleň (břečťan, krémová zeď dvora).
8. **Bílé polohovací stoly s béžovými prošívanými paravány a černými židlemi.** Charakter open spacu. *Render:* deska `#eeece6`, bílé nohy, paraván `#c9c3b8` 3–4 px vysoký se svislými 1px linkami `#b3ada2` (prošití), monitor `#141517` s obrazovkou, židle `#1e1f22` s vysokým opěradlem.
9. **Zadní stěna open spacu z matně bílých panelů s teplým LED pásem.** Dává open spacu „čistý“ vzhled. *Render:* svislé panely `#e8e6e0` se spárami `#d6d4cc` každých ~16 px a 1px linka `#f3d9a8` těsně pod horní hranou.
10. **Skleněný panel v podlaze chill-outu.** Unikátní detail. *Render:* obdélník 8×5 px `#a9c7c0` s 1px světlejší hranou `#d3e6e1` a tmavším stínem uvnitř.
11. **Prosklené kóje se světle tyrkysovými závěsy.** *Render:* skleněná stěna (průhledná vrstva) s rámem, uvnitř svislé pruhy závěsu `#7fa8a1`, na zdi uvnitř bílá „vajíčková“ pěna (šachovnice `#f0efea`/`#d9d8d2`).
12. **Firemní modrá a nápis BlueGhost.** V interiéru není, ale bez ní by člověk zvenku firmu nepoznal. *Render:* jediný výrazně modrý prvek ve scéně: cedule/banner `#0290BF` s bílým nápisem a malým duchem (podle venkovních bannerů), nad schodištěm nebo na stěně u vchodu; dál jen drobnosti (modrý koš na tříděný odpad `#1e5f8a`, obrazovky monitorů v tónu `#33bbcf`/`#bdd8e5`). Nedělat modré stěny ani podlahu, to by odporovalo fotkám.

---

## 5. Paleta

### Navržená pixel-art paleta (z fotek, idealizovaná)
Vzorky z fotek jsou ovlivněné teplým světlem a stíny, proto uvádím změřenou hodnotu i navrženou barvu.

| # | Role | Navrženo | Změřeno na fotce (orientačně) |
|---|---|---|---|
| 1 | Bílá zeď / omítka | `#ecebe6` | `#D5DDD9` (01) |
| 2 | Stín zdi, spáry panelů, ostění | `#d6d4cc` | – |
| 3 | Taupe stěna s duchem | `#a8957a` | `#957B5C`–`#A89375` (01) |
| 4 | Duch (bílá s teplým nádechem) | `#f4f1ea` | `#D1C2AA` (01, teplé světlo) |
| 5 | Antracitový koberec | `#45444a` | `#464447` (03) |
| 6 | Světlý koberec chill-outu | `#d2cfc8` | `#9E968F` ve stínu, `#E2E9EA` na světle |
| 7 | Beton sloupů | `#9a968d` (skvrny `#7d7a72`) | `#8D8980`–`#9C988F` (01) |
| 8 | Deska stolu / bílý nábytek | `#eeece6` | `#DCCFBF` (04) |
| 9 | Akustický paraván | `#c9c3b8` (prošití `#b3ada2`) | `#969998` (01), `#766A5D` (04, stín) |
| 10 | Krémové sedačky | `#e6e1d7` (stín `#cdc6b8`) | `#B1B9B9` (01), `#948C82` (04, stín) |
| 11 | Béžovo-hnědé křeslo | `#b8a993` | – (01, popředí vpravo) |
| 12 | Ocel: zábradlí, schody | `#4a4c52` (stupně `#5c6066`) | `#3D3B3F` (03), `#666A70` (05) |
| 13 | Antracit dveří a zárubní | `#2b3438` | `#273235` (05) |
| 14 | Černá: kabely, lustry, rámy dveří, židle | `#141618` (židle `#1e1f22`) | `#101417` (01) |
| 15 | Okenní rám tmavé dřevo | `#3a2418` | `#281810` (03, stín) |
| 16 | Rostliny | `#4f7a3a` / `#2f5229` | – |
| 17 | Světlé dřevo (stolek, dub v přízemí) | `#b08a5e` | `#8C715B` (04), `#957149` (05) |
| 18 | Teplé světlo (žárovky, LED pás) | `#ffd27a` / záře `#f6e3c0` | `#DCC8B6` (04, panely s LED) |
| 19 | Sklo (podlaha, příčky) / závěs | `#a9c7c0` / `#7fa8a1` | `#9C9F8E` (04) |
| 20 | Hasicí přístroj | `#c8302a` | – |

### Barvy značky BlueGhost
Zdroj: `https://www.blueghost.cz/css/new-design/variables.css` (uloženo jako `brand-variables.css`), logo SVG a `<link rel="mask-icon" color>` z homepage.

| Proměnná | Hex | Použití na webu |
|---|---|---|
| `--bondi-blue` | `#0290BF` | **hlavní modrá**, pozadí horní lišty, na které je bílé logo |
| `--bondi-blue-2` | `#008BBF` | konec přechodů |
| `--turquoise-blue` | `#33BBCF` | světlá tyrkysová, začátek přechodu v OG obrázku s duchem |
| `--color-primary` | `#00303F` | velmi tmavá petrolejová, základní barva textu a tmavých ploch |
| `--teal-blue` | `#006789` | tmavší modrá (odkazy); mask-icon `#03688a` |
| `--periwinkle-blue` | `#BDD8E5` | světlé rámečky |
| `--pattens-blue` | `#E3EFF6` | velmi světlé pozadí |
| akcenty | `#D04F55` (mandy), `#F8955E` (sandy brown), `#E9B865` (harvest gold) | doplňkové |
| logo | `#FFFFFF` | logo je vždy bílé na modré |

Doporučení: do palety scény vzít `#0290BF`, `#33BBCF`, `#00303F` a bílou. Pro logo: bílý duch/nápis na `#0290BF`, případně přechod `#33BBCF` → `#0290BF` ve 2 pruzích. Modré bannery na venkovní fotce 06 vycházejí na fotce kolem `#42A3E1`, ale to je tisk a světlo; oficiální je `#0290BF`.

---

## 6. Mapování mechanik na zóny

| Místo v aplikaci | Reálná zóna (horní patro, pokud neuvedeno jinak) | Jistota | Alternativy / poznámky |
|---|---|---|---|
| **12 pracovišť** | Open space: bílé polohovací stoly v blocích s béžovými paravány, černé židle a monitory. Na fotkách jsou bloky po 2–4 místech, stoly nejsou natočené k oknům (za nimi je zadní stěna s matnými panely, okna jsou na boční zdi u galerie). Na jedné fotce je vidět max. cca 8–10 míst. | střední (seskupení ano, přesný počet a orientace ne) | Doporučení: **3 bloky po 4** (2 vedle sebe × 2 proti sobě, paraván uprostřed bloku), nebo 2 řady po 6. Pár proti sobě: jeden sedí zády k divákovi, druhý čelem. |
| **Zasedačka + tabule ředitele** (i porady v plan mode) | Zasedací místnost z článku; poloha na fotkách neznámá. Nejbližší vizuální kandidát: prosklené místnosti se závěsy u chill-outu (foto 03 vlevo). | nízká | Prosklený box se světle tyrkysovými závěsy (shrnutými), bílá tabule na stěně nebo na kolečkách, stůl. Prosklení a závěs drží styl, i kdyby reálná zasedačka vypadala jinak. |
| **Vchod** | Antracitové ocelové schodiště z přízemí na galerii (foto 05 zdola, horní podesta na foto 03). | vysoká | Lidé přicházejí/odcházejí po schodech u otvoru se zábradlím. Výtah na fotkách není. |
| **Místo u okna** (frustrovaní koukají ven) | Hnědé dřevěné okno s převislou rostlinou u galerie (foto 02, 03). | vysoká (okno existuje), poloha ve scéně je kompromis | Na zadní stěně 2–3 okna s rostlinami, místo u okna před jedním z nich (nejlépe v open spacu nebo u schodiště). |
| **Káva** | Klubovna / kavárenský kout (článek: káva, čaj, pauza). Patro neuvedeno, pravděpodobně přízemí. | nízká | Malý kávový pult u schodiště na horním patře (kompromis). Bonus: bílé barové židle jako dole. |
| **Sedačka + TV** | Chill-out zóna (sedačky jisté). TV na fotkách není. | sedačka vysoká, TV žádná | TV/velká obrazovka na pojízdném stojanu nebo nízké skříňce proti sedačce; duch na stěně nad ní nebo vedle ní. |
| **Recepce (pult)** | Na horním patře není, v přízemní hale na fotce také ne. | žádná | Sloučit s kávovým pultem (barový pult u schodiště). Nebo nízká skříňka Office & HR. |
| **Kopírka** | Není na fotkách. | žádná | Malá bílá tiskárna na skříňce u zdi u schodiště nebo v rohu open spacu. |
| **Automat** | Není na fotkách. | žádná | Zrušit, nebo nahradit **stanicí košů na tříděný odpad** (článek, foto 02: modrý koš). |
| **Portrét zaměstnance týdne** | Není na fotkách. | žádná | Rámeček na bílé zdi u schodiště nebo v zasedačce. Nedávat ho na stěnu s duchem. |
| **Hodiny** | Nejsou na fotkách. | žádná | Na zadní stěně nad stoly nebo u schodiště, černý rámeček (sedí k černým detailům). |
| **Panel limitů** | Neexistuje. | žádná | Malá nástěnná obrazovka (dashboard) vedle hodin; displej v tónu `#00303F` s tyrkysovými `#33BBCF` znaky. |
| **Logo firmy na zdi** | Duch na taupe stěně (foto 01). | vysoká | Duch = hlavní logo. Navíc malá modrá cedule `#0290BF` s bílým „BlueGhost“ u vchodu (inspirace venkovními bannery). |

---

## 7. Návrh hrubé kompozice

1. Zadní stěna (horní pruh scény) je bílá se svazky černých kabelů pod horní hranou; zleva doprava na ni připadá zasedačka, úsek open spacu s matnými panely a teplou LED linkou, taupe úsek s velkým duchem a vpravo roh se schodištěm.
2. **Zasedačka** jako prosklený box v levé části zadní stěny (podobně jako dnešní kancelář ředitele + konferenčka, ale jako jedna místnost), uvnitř tabule úkolů ředitele, stůl a shrnuté tyrkysové závěsy; do zadní stěny zasedačky jedno hnědé okno.
3. **Open space s 12 stoly** (3 bloky po 4 se středovým béžovým paravánem) zabírá levou a střední část podlahy pod zasedačkou, na antracitovém koberci; nad ním na zadní stěně 1–2 hnědá okna s převislými rostlinami, z nichž jedno je „místo u okna“.
4. Mezi open spacem a chill-outem stojí **dva betonové sloupy** jako přirozený předěl (zároveň překážky v mřížce).
5. **Chill-out** v pravé polovině na světlém ostrůvku koberce se zubatým okrajem, před taupe stěnou s duchem (duch vysoko na stěně, aby ho nic nezakrylo); krémová L-sedačka + křeslo, kulatý dřevěný stolek, skleněný panel v podlaze, nad tím 2–3 pavoučí lustry visící od horního okraje; TV na nízké skříňce/stojanu proti sedačce.
6. **Vchod** u pravého okraje: otvor v podlaze se šedým zábradlím a schodištěm, kudy lidé přicházejí zdola; v otvoru je vidět kus světlé podlahy a dubu přízemí. Vedle je malé okno s rostlinou.
7. U schodiště **barový/kávový pult** (náhrada recepce i kuchyňky) s kávovarem, vedle stanice tříděného odpadu (náhrada automatu) a tiskárna (kopírka).
8. Na bílé zdi u schodiště **hodiny, panel limitů a portrét**, nad schodištěm modrá cedule BlueGhost; jsou to jediné modré prvky kromě obrazovek.
9. Rozložení „zasedačka vlevo, duch a schody vpravo“ je jen návrh. Pokud by duch vycházel příliš malý, je lepší zmenšit zasedačku než ducha.

---

## 8. Otevřené otázky pro autora

1. Kde přesně je **zasedačka** na horním patře a jak vypadá? Jsou prosklené místnosti se světle tyrkysovými závěsy (foto 03 vlevo, 01 vlevo) zasedačka, nebo kóje/tiché budky?
2. Je **klubovna s kávou** v přízemí (místnost s dubovou podlahou / bar s barovými židlemi)? Je nahoře nějaký kávovar, lednice nebo kuchyňka?
3. Je v chill-outu **TV nebo velká obrazovka**? Kam jsou sedačky otočené?
4. Jak jsou **stoly** reálně rozestavené (kolik bloků, kolik míst v bloku, natočení)? A je jich nahoře opravdu kolem 12?
5. Na kterých stěnách horního patra jsou **okna** a co je z nich vidět (dvůr s břečťanem jako na foto 06)? Jsou matně bílé panely na zadní stěně open spacu zakrytá okna, nebo příčka?
6. Kam vedou **dveře s černým rámem** vedle ducha (foto 01)? Je nahoru jiný přístup než ocelové schodiště z haly (třeba venkovní schodiště z foto 06)?
7. Je v kanceláři ještě jiné **logo/nápis BlueGhost** nebo další duch (polštáře, samolepky, nafukovací duchové jako na foto 06)? Jsou na zdech obrazy, ceny (WebTop100) nebo nástěnka?
8. Kde stojí **tiskárna** a visí **hodiny**, pokud vůbec?
