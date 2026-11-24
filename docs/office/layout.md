# Layout kanceláře BlueGhost – textový půdorys (návrh v6)

Podklad pro kontrolu autorem před kreslením. Styl, inventář a paleta jsou v [brief.md](brief.md); jeho sekce 7 (kompozice) je **nahrazená** autorovým popisem kanceláře a tímto dokumentem. Obě mapy odpovídají 1:1 mřížce chůze (`world/path.js`, buňka 4×4 px) na plátně 320×180, každé patro je samostatná scéna.

**Změny proti v5 (podle připomínek autora)**
- **Přízemí je o hloubku zasedačky menší:** zadní stěna haly i klubovny (s barem) je posunutá dovnitř na ř 20, podlaha je ř 21–31 (ve svislé části 21–43). Šikmá příčka je tím kratší (12 buněk), široký průchod s černým rámem je dál uprostřed, bar končí přední hranou na posledním řádku šikminy. V zadní stěně přízemí nejsou okna ani světlíky.
- **Horní patro:** bloky stolů u zadní stěny jsou **dál od sebe** – mezi dvěma židlemi zády k sobě jsou 4 volné buňky, takže se uličkou dá projít – a řada bloků sahá skoro ke dveřím zasedačky (poslední stůl končí ve sl 60). Počet stolů je beze změny (18 + 4 + 2). **Židle v pravé části** jsou srovnané: každé sedadlo má přesně jeden stůl před sebou a žádný za zády ani po boku. Lustry nevisí nad stoly.

**V kostce**
- **Tvar L (obě patra stejně):** vodorovná část = řádky 12–31 přes celou šířku; svislá část vpravo = sloupce 46–78 až dolů (řádky 12–43). Zkosení vnitřního rohu = 3 buňky (42, 32) → (44, 34) – v přízemí vchodové dveře, nahoře okno. Vlevo dole (sloupce 0–44, řádky 33–44) je dvůr. Obrys je na obou patrech buňka po buňce stejný.
- **Zadní stěna:** nahoře řádky 0–11 (y < 46, `FLOOR_Y = 46`); **v přízemí řádky 0–20** (y < 84, podlaha od ř 21).
- **Schodiště** má na obou patrech stejnou stopu: sloupce 8–24 × řádky 27–31 (5 řádků), podél přední (dvorní) fasády. Dole začíná u haly (portál `Z` (25, 29)), nahoře končí na západním konci čelem k levé stěně s koši (portál `Z` (7, 29)).
- **Přízemí:** příchod `E` (1, 34) u brány dvora, cesta po ř 33–34 ke vchodovým dveřím na zkosení; za nimi hala, vpravo šikmá příčka s průchodem do klubovny. Recepce naproti vchodu u zadní stěny, vpravo od ní v rohu u příčky šikmé dveře do zapuštěné zasedačky; vlevo kuchyňka a WC (jen dveře), u levé stěny věšáky a bobík.
- **Horní patro:** 18 stolů u zadní stěny (stůl u levé stěny + 4 bloky po 4, rozestoupené až ke zasedačce), zasedačka vpravo nahoře, pod ní u pravé zdi blok A (4 stoly) a blok B (2 stoly), pod ním tiskárna, 3 kóje podél spodní stěny; chill zóna mezi sloupy a pravou částí.
- **Stoly:** horní patro **24** pracovních míst (18 + 4 + 2), přízemí **0** (9 stolků v klubovně = 18 míst).

---

## 1. Jak číst mapu

**Souřadnice.** Sloupec `sl` 0–79 → x = 4·sl … 4·sl+3 (x 0–319), řádek `ř` 0–44 → y = 4·ř … 4·ř+3 (y 0–179). Bod místa (spotu) je **střed buňky** (4·sl+2, 4·ř+2), stejně jako počítá `path.js`. Nad mapou jsou dva řádky pravítka (desítky a jednotky sloupce), každý řádek mapy začíná dvoumístným číslem řádku a mezerou (řádek tisku má 83 znaků).

**Hranice.** `path.js` má okraj 3 px a podlahu od y ≥ 48, takže sloupec 0, sloupec 79, řádek 44 a pás zadní stěny (nahoře ř 0–11, v přízemí ř 0–20) nejsou nikdy pochozí – mapa je používá pro zdi, fasádu a zadní stěnu. Pochozí jsou jen sloupce 1–78 a řádky 12–43 (v přízemí 21–43).

**Zadní stěna (nahoře řádky 0–11, v přízemí 0–20)** je svislý pás; znaky v něm jsou věci **na zdi** (dveře, TV, tabule, duch), ne podlaha. Dveře v pásu se „používají“ z buňky podlahy pod nimi.

**Šikmé stěny** (zkosení u vchodu, příčka v přízemí, roh zasedačky nahoře) jsou v mapě schody z jednotlivých buněk; kreslit je jako souvislou čáru pod 45°. Mřížka je přes ně neprůchodná, protože A* v `path.js` diagonálně přes roh nepustí.

**Sedadla na čalouněném nábytku** (gauč, křeslo, bobík, barová židle) jsou kotvy **uvnitř** nábytku (nepochozí), stejně jako dnešní `SOFA`: cesta skončí na nejbližší volné buňce a poslední krok jde na sedadlo. **Sedadla u stolů a v kójích** jsou naopak volné buňky podlahy hned vedle stolu (tam se kreslí židle).

| znak | význam | pochozí |
|---|---|---|
| **Stěny a konstrukce** | | |
| `=` | zadní stěna (pás nahoře; nahoře ř 0–11, v přízemí ř 0–20) | ne |
| `W` | plná zeď: levá a pravá obvodová, v přízemí šikmá příčka hala / klubovna | ne |
| `_` | přední fasáda – „průhledná“ stěna k divákovi, seříznutá, s okny | ne |
| `\|` | boční fasáda svislé části L ke dvoru (sl 45, ř 35–43), seříznutá | ne |
| `\` | zkosení vnitřního rohu pod 45° (nahoře okno; v přízemí jsou na jeho místě vchodové dveře `D`) | ne |
| `#` | skleněná stěna (zasedačka nahoře, včetně šikmého rohu) | ne |
| `D` | dveře: v pásu zadní stěny = dveře ve zdi; v příčce, skle, kóji a na zkosení = **průchod (pochozí)** | viz text |
| `Y` | šikmé prosklené dveře do **zapuštěné zasedačky** v přízemí (v rohu u šikmé příčky; v pásu = jejich čelo) | ne |
| `O` | betonový sloup (na obou patrech na stejném místě) | ne |
| `S` | schodiště (přízemí); chodí se po něm jen animací portálu | ne |
| `~` | otvor nad schodištěm (horní patro), dole vidět stupně | ne |
| `:` | ocelové zábradlí | ne |
| **Podlahy** | | |
| `.` | volná podlaha (nahoře antracitový koberec, v hale světlá hladká podlaha) | ano |
| `;` | volná podlaha – světlý koberec chill zóny (zubatý okraj) | ano |
| `-` | volná podlaha – imitace dřeva (klubovna) | ano |
| `,` | dvůr, dlažba (mimo kancelář) | v přízemí ano (ř 33–43), nahoře ne |
| **Nábytek a vybavení** | | |
| `d` | pracovní stůl. U zadní stěny: stůl u zdi 4×8 buněk = 2 stoly za sebou (ř 12–15 a 16–19), blok 8×8 buněk = 4 stoly (2 vlevo, 2 vpravo, uprostřed nízký paraván). V pravé části blok A = 4 stoly, blok B = 2 stoly | ne |
| `T` | stůl v zasedačce (diagonální) | ne |
| `h` | židle u stolu v zasedačce (dekorace) | ne |
| `t` | malý stolek (klubovna, chill zóna, stolek u gauče, kulatý stolek v hale, pivní set na dvoře) | ne |
| `s` | gauč (v klubovně modrý, svisle; v přízemí i malý gaučík pod schody, uvnitř stopy schodiště) | ne |
| `a` | křeslo | ne |
| `e` | bobík (dlouhý sedák podél levé stěny) | ne |
| `b` | bar (pult podél zdi) | ne |
| `M` | kávovar na baru | ne |
| `i` | barová židle = sedadlo, sedí se čelem k baru (zády k divákovi) | ne (kotva) |
| `R` | recepční pult | ne |
| `x` | stolek se zmrzlinovačem a svačinou | ne |
| `p` | tiskárna | ne |
| `C` | stěny telefonní kóje (sklo + tyrkysový závěs) | ne |
| `u` | šuplíky na věci | ne |
| `k` | odpadkové koše (tříděný odpad) | ne |
| `g` | průhled z mléčného skla v podlaze | ne (aby ho nikdo nezakrýval) |
| `&` | rostlina / břečťan | ne |
| `n` | lavice pivního setu (dvůr) | ne |
| `!` | modrý banner BlueGhost na fasádě (dvůr) | ne |
| **Na zdi (v pásu ř 0–11)** | | |
| `V` | televize: v přízemí nad recepcí (hodiny + limity); nahoře v zasedačce nad pravým koncem stolu | – |
| `X` | tabule úkolů ředitele | – |
| `P` | menší tabule pro poradu v plan mode (nahoře nad TV) | – |
| `G` / `%` | malovaný bílý duch / béžovošedý (taupe) panel pod ním | – |
| `L` | svítící bílý LED duch s nápisem BlueGhost (nad barem) | – |
| `F` | portrét zaměstnance týdne | – |
| `@` | terč na šipky | – |
| `H` | věšáky (na levé zdi, sl 0) | – |
| **Místa (spoty)** | | |
| `<` | sedí, profil vlevo (dívá se na západ / doleva) | ano u stolu, kotva u gauče |
| `>` | sedí, profil vpravo (dívá se na východ / doprava) | ano u stolu, kotva u gauče a bobíku |
| `v` | sedí/stojí čelem k divákovi (je vidět obličej) | ano / kotva |
| `^` | sedí/stojí zády k divákovi | ano / kotva |
| `Z` | portál schodiště (dole / nahoře) | ano |
| `E` | příchod/odchod lidí – brána dvora u levého okraje | ano |
| `$` | káva | ano |
| `w` | místo u okna | ano |
| `m` | stání na poradě v plan mode | ano |
| `c` | dvojice na pokec: dvě kotvy 4 sloupce (16 px) od sebe, mezi nimi volno (dnešní `chatPair` = 15 px) | ano |
| `+` | jiné pojmenované místo (viz tabulka) | ano |
| `U` | šipky přepínání pater (UI nad dvorem) | – |
| **Dekorace na podlaze** | | |
| `*` | nad touto buňkou visí pavoučí lustr (jen nahoře, nikdy nad stolem ani hned vedle; buňka zůstává volná podlaha) | ano |

---

## 2. Přízemí

```text
   00000000001111111111222222222233333333334444444444555555555566666666667777777777
   01234567890123456789012345678901234567890123456789012345678901234567890123456789
00 ================================================================================
01 ================================================================================
02 ================================================================================
03 ================================================================================
04 ================================================================================
05 ================================================================================
06 ================================================================================
07 ================================================================================
08 ================================================================================
09 ================================================================================
10 ================================================================================
11 ================================================================================
12 =======================================VVVVVVV=================LLLLLLLLLLLLLLL==
13 ===============DDDD=====DDDD===========VVVVVVV=========YY======LLLLLLLLLLLLLLL==
14 ===============DDDD=====DDDD===========VVVVVVV=========YY@@@===LLLLLLLLLLLLLLL==
15 ===============DDDD=====DDDD===========VVVVVVV=========YY@@@===LLLLLLLLLLLLLLL==
16 ===============DDDD=====DDDD===========VVVVVVV=========YY@@@===LLLLLLLLLLLLLLL==
17 ===============DDDD=====DDDD===========VVVVVVV=========YY======LLLLLLLLLLLLLLL==
18 ===============DDDD=====DDDD===========VVVVVVV=========YY======LLLLLLLLLLLLLLL==
19 ===============DDDD=====DDDD===========================YY=======================
20 ===============DDDD=====DDDD===========================YY=======================
21 W...............+........+............RRRRRRRRR.........YxxxMMMbbbbbbbbbbbbbbbbW
22 Hee...................................RRRRRRRRR.....tt..WxxxMMMbbbbbbbbbbbbbbbbW
23 He>.......................................+.........tt.W--+-$-$--i--i--i--i--i-W
24 Hee...........c...c.........c...c.....................W------------------------W
25 Hee..................................................W-------------------------W
26 He>.................................................D-----+---v-----v-----v----W
27 W.......s^ss^sttSSSSSSSSS..........................D---------ttt---ttt---ttt---W
28 W.......ssssssttSSSSSSSSS.........................D----------ttt---ttt---ttt---W
29 W.......SSSSSSSSSSSSSSSSSZ.......OO....OO........D------------^-----^-----^----W
30 W&&.....SSSSSSSSSSSSSSSSS........OO....OO.......W------------------------------W
31 W&&.....SSSSSSSSSSSSSSSSS......................W------c---c---v-----v-----v----W
32 __________________________________________D...W--------------ttt---ttt---ttt---W
33 ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,D.W---------------ttt---ttt---ttt---W
34 ,E,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,DWsss-------------^-----^-----^----W
35 &&,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,|ss>------------------------------W
36 &&,,,,,,,,,,,,,,,,,,,,,,,,,,,,&&,,,,,,,,,,,!!|sss-------------v-----v-----v----W
37 &&,,,,,,,,,,,,nnnnnnnnnn,,,,,,&&,,,,,,,,,,,!!|sss------------ttt---ttt---ttt---W
38 &&,,,,,,,,,,,,,tttttttt,,,,,,,,,,,,,,,,,,,,!!|sss-tt---------ttt---ttt---ttt---W
39 &,,,,,,,,,,,,,nnnnnnnnnn,,,,,,,,,,,,,,,,,,,,,|ss>-tt----------^-----^-----^----W
40 &,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,!!|sss------------------------------W
41 &UUUUUU,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,!!|sss---------------c---c--------&&W
42 &UUUUUU,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,!!|sss----------------------------&&W
43 &UUUUUU,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,|ss>----------------------------&&W
44 &,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,___________________________________
```

**Zóny**
- **Menší přízemí:** zadní stěna haly i klubovny je posunutá dovnitř o hloubku zasedačky – pás zadní stěny zabírá ř 0–20, podlaha je ř 21–31 (ve svislé části 21–43). Za stěnou jsou místnosti, které se nekreslí (zapuštěná zasedačka za barem, kuchyňka, WC). Obrys budovy i dvůr jsou stejné jako nahoře.
- **Dvůr a příchod** (sl 1–44, ř 33–43, pochozí): lidé se objeví na `E` (1, 34) u brány v levém okraji (sl 0, ř 33–34) a jdou po dlažbě podél fasády (ř 33–34) ke **vchodovým dveřím na zkosení** – 3 buňky `D` (42, 32), (43, 33), (44, 34), dvoukřídlé, antracitový rám, šikmo do dvora. Pivní set, květináč, bannery a šipky pater stojí mimo tuto cestu.
- **Šikmá příčka hala / klubovna** vede pod 45° celá: od spodního ostění vchodových dveří (roh (45, 34)) jedna buňka na řádek nahoru doprava, (45, 33) → (56, 22), 12 buněk, a končí na řádku přední hrany baru. Nahoře ji uzavírá stolek se svačinou (57–59, 21–22) u zadní stěny. **Uprostřed** příčky je **široký průchod s černým rámem** `D` (49, 29), (50, 28), (51, 27), (52, 26). Vchodové dveře sousedí jen s halou; do klubovny se dá jen tímto průchodem (ověřeno).
- **Hala** (světlá hladká podlaha) – vše západně od příčky. Řádky: ř 21–22 zeď a nábytek u ní (recepce, dveře), **ř 23–26 volná chodba (4 řádky)**, ř 27–31 schodiště a prostor před ním. Naproti vstupu u zadní stěny **recepce** `R` (sl 38–46, 2 řádky), nad ní **TV s hodinami a panelem limitů**. V rohu, kde příčka potkává zadní stěnu, jsou **šikmé prosklené dveře do zasedačky** `Y` (56, 21) s čelem v pásu (sl 55–56). Vlevo za recepcí na zadní stěně **dveře do kuchyňky** (sl 24–27), vlevo od nich **jedny dveře WC** (sl 15–18). U levé zdi **věšáky** `H` a **bobík** `e` (ř 22–26, 2 místa). V trojúhelníku haly u příčky kulatý bílý stolek (foto 05). V hale stojí oba **betonové sloupy** `O` (33–34, 29–30) a (39–40, 29–30), stejně jako nahoře.
- **Schodiště** `S` (sl 8–24, ř 27–31, 5 řádků) podél přední fasády, stoupá doleva. **Pod jeho vyšším (západním) koncem** je **malý gaučík pro 2** `s` (sl 8–13, ř 27–28) **čelem k WC** a vedle něj **stolek** `t` (sl 14–15) – leží uvnitř stopy schodiště, kreslí se pod ramenem; sedí se na něj z chodby (ř 26). Levý dolní kout (sl 1–7, ř 27–31) je také pod schody (rostlina).
- **Klubovna** (imitace dřeva) – vše východně od příčky:
  - vlevo nahoře v rohu u příčky **stolek se zmrzlinovačem a svačinou** `x` (sl 57–59) a nad ním na zdi **terč na šipky** `@`; hráč stojí na (58, 26);
  - **bar** `b` podél zadní stěny, **19 sloupců** (sl 60–78, ř 21–22; přední hrana na ř 22 = konec šikmé příčky), s **kávovarem** `M` na levém konci, 2 místy na kávu a 5 **barovými židlemi** `i`; nad barem **svítící LED duch s nápisem** `L`;
  - **9 malých stolků** ve mřížce 3×3 (středy sl 62, 68, 74; ř 27, 32, 37), po 2 židlích sever/jih; mezi řadami stolků je jen 1 řádek uličky;
  - vlevo dole **modrý gauč otočený o 90°** (`s` sl 46–48, ř 34–43, 3 místa z profilu čelem doprava) a vedle něj malý stolek.

**Místa v přízemí** (řádky se znakem `D` jsou průchody, ne místa k pobytu)

| # | znak | (sl, ř) | (x, y) px | natočení | účel |
|---|---|---|---|---|---|
| 1 | `E` | (1, 34) | (6, 138) | přichází doprava | příchod/odchod: brána dvora u levého okraje (sl 0, ř 33–34) |
| 2 | `D` | (43, 33) | (174, 134) | šikmo | vchodové dveře na zkosení (průchod, 3 buňky (42,32)–(44,34)) |
| 3 | `D` | (50, 28) | (202, 114) | šikmo | široký průchod s černým rámem do klubovny uprostřed šikmé příčky (4 buňky (49,29)–(52,26)) |
| 4 | `>` | (2, 23) | (10, 94) | profil vpravo | bobík u věšáků – kotva na nábytku |
| 5 | `>` | (2, 26) | (10, 106) | profil vpravo | bobík u věšáků – kotva na nábytku |
| 6 | `+` | (42, 23) | (170, 94) | zády (k pultu) | u recepce (pult R, nad ním TV s hodinami a limity) |
| 7 | `+` | (16, 21) | (66, 86) | zády (ke dveřím) | dveře WC |
| 8 | `+` | (25, 21) | (102, 86) | zády (ke dveřím) | dveře do kuchyňky |
| 9 | `^` | (9, 27) | (38, 110) | zády (od diváka) | gaučík pod schody (čelem k WC) – kotva na nábytku |
| 10 | `^` | (12, 27) | (50, 110) | zády (od diváka) | gaučík pod schody (čelem k WC) – kotva na nábytku |
| 11 | `Z` | (25, 29) | (102, 118) | odchází doleva po schodech | schody – dolní konec (portál nahoru) |
| 12 | `+` | (58, 23) | (234, 94) | zády (ke stolku) | stolek se zmrzlinovačem a svačinou |
| 13 | `+` | (58, 26) | (234, 106) | zády (k terči) | házení šipek na terč @ |
| 14 | `$` | (60, 23) | (242, 94) | zády (k baru) | káva u kávovaru na baru |
| 15 | `$` | (62, 23) | (250, 94) | zády (k baru) | káva u kávovaru na baru |
| 16 | `i` | (65, 23) | (262, 94) | zády (k baru) | barová židle u baru – kotva na nábytku |
| 17 | `i` | (68, 23) | (274, 94) | zády (k baru) | barová židle u baru – kotva na nábytku |
| 18 | `i` | (71, 23) | (286, 94) | zády (k baru) | barová židle u baru – kotva na nábytku |
| 19 | `i` | (74, 23) | (298, 94) | zády (k baru) | barová židle u baru – kotva na nábytku |
| 20 | `i` | (77, 23) | (310, 94) | zády (k baru) | barová židle u baru – kotva na nábytku |
| 21 | `v` | (62, 26) | (250, 106) | čelem (k divákovi) | stolek 1, sever |
| 22 | `^` | (62, 29) | (250, 118) | zády (od diváka) | stolek 1, jih |
| 23 | `v` | (68, 26) | (274, 106) | čelem (k divákovi) | stolek 2, sever |
| 24 | `^` | (68, 29) | (274, 118) | zády (od diváka) | stolek 2, jih |
| 25 | `v` | (74, 26) | (298, 106) | čelem (k divákovi) | stolek 3, sever |
| 26 | `^` | (74, 29) | (298, 118) | zády (od diváka) | stolek 3, jih |
| 27 | `v` | (62, 31) | (250, 126) | čelem (k divákovi) | stolek 4, sever |
| 28 | `^` | (62, 34) | (250, 138) | zády (od diváka) | stolek 4, jih |
| 29 | `v` | (68, 31) | (274, 126) | čelem (k divákovi) | stolek 5, sever |
| 30 | `^` | (68, 34) | (274, 138) | zády (od diváka) | stolek 5, jih |
| 31 | `v` | (74, 31) | (298, 126) | čelem (k divákovi) | stolek 6, sever |
| 32 | `^` | (74, 34) | (298, 138) | zády (od diváka) | stolek 6, jih |
| 33 | `v` | (62, 36) | (250, 146) | čelem (k divákovi) | stolek 7, sever |
| 34 | `^` | (62, 39) | (250, 158) | zády (od diváka) | stolek 7, jih |
| 35 | `v` | (68, 36) | (274, 146) | čelem (k divákovi) | stolek 8, sever |
| 36 | `^` | (68, 39) | (274, 158) | zády (od diváka) | stolek 8, jih |
| 37 | `v` | (74, 36) | (298, 146) | čelem (k divákovi) | stolek 9, sever |
| 38 | `^` | (74, 39) | (298, 158) | zády (od diváka) | stolek 9, jih |
| 39 | `>` | (48, 35) | (194, 142) | profil vpravo | modrý gauč v klubovně (svisle) – kotva na nábytku |
| 40 | `>` | (48, 39) | (194, 158) | profil vpravo | modrý gauč v klubovně (svisle) – kotva na nábytku |
| 41 | `>` | (48, 43) | (194, 174) | profil vpravo | modrý gauč v klubovně (svisle) – kotva na nábytku |
| 42 | `c` | (14, 24) | (58, 98) | – | dvojice na pokec A (1/2) |
| 43 | `c` | (18, 24) | (74, 98) | – | dvojice na pokec A (2/2) |
| 44 | `c` | (28, 24) | (114, 98) | – | dvojice na pokec B (1/2) |
| 45 | `c` | (32, 24) | (130, 98) | – | dvojice na pokec B (2/2) |
| 46 | `c` | (54, 31) | (218, 126) | – | dvojice na pokec C (1/2) |
| 47 | `c` | (58, 31) | (234, 126) | – | dvojice na pokec C (2/2) |
| 48 | `c` | (64, 41) | (258, 166) | – | dvojice na pokec D (1/2) |
| 49 | `c` | (68, 41) | (274, 166) | – | dvojice na pokec D (2/2) |

**Plochy na procházení (stroll) a náhodné pokecy**
- G1 chodba haly: sl 3–37 × ř 23–26 → x 12, y 92, 140×16 px
- G2 hala před schody k vchodu: sl 26–44 × ř 27–31 → x 104, y 108, 76×20 px
- G3 klubovna, ulička pod barem: sl 57–78 × ř 24–25 → x 228, y 96, 88×8 px
- G4 klubovna dole: sl 52–76 × ř 40–43 → x 208, y 160, 100×16 px
- (dvůr ř 33–34 je jen cesta příchozích, ne plocha na procházení)

---

## 3. Horní patro

```text
   00000000001111111111222222222233333333334444444444555555555566666666667777777777
   01234567890123456789012345678901234567890123456789012345678901234567890123456789
00 ================================================================================
01 =====================================%%%%%%%%%%==========================PPPPPP=
02 ==FFFFF==============================%%GGGGGG%%==========================PPPPPP=
03 ==FFFFF==============================%%GGGGGG%%=================XXXXXXXXXPPPPPP=
04 ==FFFFF==============================%%GGGGGG%%=================XXXXXXXXXPPPPPP=
05 ==FFFFF==============================%%GGGGGG%%=================XXXXXXXXXPPPPPP=
06 ==FFFFF==============================%%GGGGGG%%================#XXXXXXXXX=VVVVV=
07 ==FFFFF==============================%%GGGGGG%%================#XXXXXXXXX=VVVVV=
08 ==FFFFF==============================%%GGGGGG%%================#XXXXXXXXX=VVVVV=
09 =====================================%%%%%%%%%%================#XXXXXXXXX=VVVVV=
10 =====================================%%%%%%%%%%================#==========VVVVV=
11 ===============================================================#================
12 Wdddd......dddddddd......dddddddd......dddddddd......dddddddd..#.........hTTTTTW
13 Wdddd......dddddddd......dddddddd......dddddddd......dddddddd..#....+...hTTTTThW
14 Wdddd<....>dddddddd<....>dddddddd<....>dddddddd<....>dddddddd<.#.......hTTTTTh.W
15 Wdddd......dddddddd......dddddddd......dddddddd......dddddddd..#...m..hTTTTTh..W
16 Wdddd......dddddddd..*...dddddddd......dddddddd..*...dddddddd..#...............W
17 Wdddd......dddddddd......dddddddd......dddddddd......dddddddd..#.....m.........W
18 Wdddd<....>dddddddd<....>dddddddd<....>dddddddd<....>dddddddd<..D.........m....W
19 Wdddd......dddddddd......dddddddd......dddddddd......dddddddd....D....+........W
20 W.................................................................#############W
21 W..............................................................................W
22 W..........................................;;;;;;aaaa;;;;;;;........v......v...W
23 Wuuu........................c...c...*......sss;;;avaa;;;;sss.....ddddddddddddddW
24 Wuuu.......................................sss;;;;;;;;;;;sss.....ddddddddddddddW
25 Wuuu+........w.....w.......................ss>;;;;;;;*;;;<ss.....ddddddddddddddW
26 Wuuu.....:::::::::::::::::.................sss;ttgggg;tt;sss.....ddddddddddddddW
27 W.......~~~~~~~~~~~~~~~~~:.................sss;ttgggg;tt;sss.....ddddddddddddddW
28 Wkkk....~~~~~~~~~~~~~~~~~:.................sss;;;;;;;;;;;sss..*.....^......^...W
29 Wkkk+..Z~~~~~~~~~~~~~~~~~:.c...c.OO....OO..ss>;;;;;;;;;;;<ss...................W
30 Wkkk....~~~~~~~~~~~~~~~~~:.......OO....OO..sss;;;a^aa;;;;sss...................W
31 Wkkk....~~~~~~~~~~~~~~~~~:.................;;;;;;aaaa;;;;;;;........v......v...W
32 __________________________________________\......................ddddddddddddddW
33 ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\.....................ddddddddddddddW
34 ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\....c...c...........ddddddddddddddW
35 &&,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,|.............................ppppW
36 &&,,,,,,,,,,,,,,,,,,,,,,,,,,,,&&,,,,,,,,,,,!!|............*................ppppW
37 &&,,,,,,,,,,,,nnnnnnnnnn,,,,,,&&,,,,,,,,,,,!!|..............................+..W
38 &&,,,,,,,,,,,,,tttttttt,,,,,,,,,,,,,,,,,,,,!!|.................................W
39 &,,,,,,,,,,,,,nnnnnnnnnn,,,,,,,,,,,,,,,,,,,,,|CCCCDCCCCCCCCCCCDCCCCCCCCCCCDCCCCW
40 &,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,!!|.........C.............C.........W
41 &UUUUUU,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,!!|.........C.............C.........W
42 &UUUUUU,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,!!|....v....C......v......C....v....W
43 &UUUUUU,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,|CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCW
44 &,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,___________________________________
```

**Zóny**
- **Stoly u zadní stěny** (ř 12–19), zleva: **stůl u levé stěny** (sl 1–4, 2 stoly za sebou), u něj 2 lidé čelem ke zdi; pak **4 bloky** se společnou deskou (sl 11–18, 25–32, 39–46, 53–60), každý = 4 stoly 4×4 buňky: 2 lidé vlevo čelem doprava (`>`), 2 vpravo čelem doleva (`<`), uprostřed desky nízký paraván. Mezi bloky sedí lidé **zády k sobě** a mezi jejich židlemi jsou **4 volné sloupce** (sl 6–9, 20–23, 34–37, 48–51), takže se uličkou dá projít. Řada bloků končí ve sl 60, poslední sedadlo je ve sl 61 hned vedle zasedačky. Sedadla na ř 14 (stůl u zdi) a ř 18 (druhý stůl). **18 stolů.**
- **Chodba** ř 20–21 přes celou šířku před bloky – od schodů ke všem uličkám a ke dveřím zasedačky; pod ní volná plocha ř 22–25 a na ř 25 u zábradlí 2 **místa u okna** `w`.
- **Levá stěna naproti schodům:** **šuplíky** `u` (sl 1–3, ř 23–26) a **koše** `k` (sl 1–3, ř 28–31), čelem k hornímu konci schodů `Z` (7, 29).
- **Průhled se schodištěm** `~` (sl 8–24, ř 27–31) se **zábradlím** `:` (ř 26 a sl 25). Mezi průhledem a chill zónou je volná plocha (sl 26–42) a **betonové sloupy** `O` (33–34, 29–30) a (39–40, 29–30).
- **Chill zóna** (sl 43–59, ř 22–31, světlý koberec 17×10): 2 **gauče svisle** proti sobě (`s` 3×8, 2 místa každý, z profilu), 2 **křesla vodorovně** proti sobě (`a` 4×2, sever čelem, jih zády), 2 **stolky** `t` (kulatý dřevěný a bílý ve tvaru C), uprostřed **mléčné sklo** `g` (4×2). Nad ní visí **jeden** pavoučí lustr (`*` (53, 25)).
- **Malovaný duch** na béžovošedém panelu (`%` sl 37–46, `G` sl 39–44, duch 24×28 px) visí na zadní stěně nad blokem 3.
- **Zasedačka** (sl 63–78, ř 12–20, prosklená): západní sklo sl 63 (ř 12–16), **zkosený jihozápadní roh** (63, 17) sklo, **dveře** `D` (64, 18) a (65, 19), (66, 20) sklo, jižní sklo ř 20 (sl 67–78). **Diagonální stůl** `T` z pravého horního rohu doleva dolů (4 řádky, 5 buněk široký: (74–78, 12) → (71–75, 15)), kolem 7 židlí. Na zadní stěně **tabule úkolů ředitele** `X` (sl 64–72), **TV** `V` nad horním koncem stolu (sl 74–78) a nad ní menší **tabule pro plan mode** `P` (sl 73–78). Ředitel stojí u `X` (68, 13) a u skla (70, 19), porada (`m`) na (67, 15), (69, 17) a (74, 18) – nic se stolu nedotýká.
- **Pravá část, až u pravé zdi** (sl 65–78): **blok A** = deska ř 23–27, severní řada `v` na ř 22 hned nad deskou, jižní řada `^` na ř 28 hned pod ní; **blok B** = deska ř 32–34, jen severní řada `v` na ř 31 hned nad ní. Sedadla jsou ve středu každého stolu (sl 68 a 75), každé má přesně jeden stůl před sebou a nic za zády ani po boku. Uličky: ř 21 pod zasedačkou, ř 29–30 mezi bloky; vlevo od bloků průchod sl 60–64 (5 sloupců) od dveří zasedačky ke kójím.
- **Tiskárna** `p` pod blokem B u pravé zdi (sl 75–78, ř 35–36), stojí se u ní z (76, 37); ř 37–38 zůstávají volné před dveřmi kójí.
- **3 telefonní kóje** podél spodní stěny svislé části, 5 řádků hluboké (ř 39–43): vnitřek sl 46–54, **prostřední větší** sl 56–68, sl 70–78; každá má dveře `D` v severní stěně (ř 39) a jedno sedadlo `v` čelem k divákovi.
- **Pavoučí lustry** `*` (6, žádný nad stolem ani hned vedle): (53, 25) nad chill zónou; (21, 16) a (49, 16) v uličkách mezi bloky; (36, 23) na volné ploše u průhledu; (62, 28) v průchodu u pravé části; (58, 36) v chodbě před kójemi. V přízemí žádné.
- **Portrét zaměstnance týdne** `F` visí vlevo nahoře na zadní stěně (jako dnes).

**Místa na horním patře** (stoly 1–24)

| # | znak | (sl, ř) | (x, y) px | natočení | účel |
|---|---|---|---|---|---|
| 1 | `<` | (5, 14) | (22, 58) | profil vlevo | stůl 1 (stůl u levé stěny, u zdi, čelem ke zdi) |
| 2 | `<` | (5, 18) | (22, 74) | profil vlevo | stůl 2 (stůl u levé stěny, druhý stůl, čelem ke zdi) |
| 3 | `>` | (10, 14) | (42, 58) | profil vpravo | stůl 3 (blok 1, levá strana, u zdi) |
| 4 | `>` | (10, 18) | (42, 74) | profil vpravo | stůl 4 (blok 1, levá strana, druhý stůl) |
| 5 | `<` | (19, 14) | (78, 58) | profil vlevo | stůl 5 (blok 1, pravá strana, u zdi) |
| 6 | `<` | (19, 18) | (78, 74) | profil vlevo | stůl 6 (blok 1, pravá strana, druhý stůl) |
| 7 | `>` | (24, 14) | (98, 58) | profil vpravo | stůl 7 (blok 2, levá strana, u zdi) |
| 8 | `>` | (24, 18) | (98, 74) | profil vpravo | stůl 8 (blok 2, levá strana, druhý stůl) |
| 9 | `<` | (33, 14) | (134, 58) | profil vlevo | stůl 9 (blok 2, pravá strana, u zdi) |
| 10 | `<` | (33, 18) | (134, 74) | profil vlevo | stůl 10 (blok 2, pravá strana, druhý stůl) |
| 11 | `>` | (38, 14) | (154, 58) | profil vpravo | stůl 11 (blok 3, levá strana, u zdi) |
| 12 | `>` | (38, 18) | (154, 74) | profil vpravo | stůl 12 (blok 3, levá strana, druhý stůl) |
| 13 | `<` | (47, 14) | (190, 58) | profil vlevo | stůl 13 (blok 3, pravá strana, u zdi) |
| 14 | `<` | (47, 18) | (190, 74) | profil vlevo | stůl 14 (blok 3, pravá strana, druhý stůl) |
| 15 | `>` | (52, 14) | (210, 58) | profil vpravo | stůl 15 (blok 4, levá strana, u zdi) |
| 16 | `>` | (52, 18) | (210, 74) | profil vpravo | stůl 16 (blok 4, levá strana, druhý stůl) |
| 17 | `<` | (61, 14) | (246, 58) | profil vlevo | stůl 17 (blok 4, pravá strana, u zdi) |
| 18 | `<` | (61, 18) | (246, 74) | profil vlevo | stůl 18 (blok 4, pravá strana, druhý stůl) |
| 19 | `+` | (4, 25) | (18, 102) | k levé stěně | šuplíky na věci |
| 20 | `+` | (4, 29) | (18, 118) | k levé stěně | koše na tříděný odpad |
| 21 | `Z` | (7, 29) | (30, 118) | příchod čelem k levé stěně | schody – horní konec (portál do přízemí) |
| 22 | `w` | (13, 25) | (54, 102) | čelem (k divákovi) | místo u okna: u zábradlí, dívá se přes průhled k oknu ve fasádě |
| 23 | `w` | (19, 25) | (78, 102) | čelem (k divákovi) | místo u okna 2: u zábradlí |
| 24 | `v` | (50, 23) | (202, 94) | čelem (k divákovi) | chill: křeslo sever – kotva na nábytku |
| 25 | `^` | (50, 30) | (202, 122) | zády (od diváka) | chill: křeslo jih – kotva na nábytku |
| 26 | `>` | (45, 25) | (182, 102) | profil vpravo | chill: gauč západ, místo 1 – kotva na nábytku |
| 27 | `>` | (45, 29) | (182, 118) | profil vpravo | chill: gauč západ, místo 2 – kotva na nábytku |
| 28 | `<` | (57, 25) | (230, 102) | profil vlevo | chill: gauč východ, místo 1 – kotva na nábytku |
| 29 | `<` | (57, 29) | (230, 118) | profil vlevo | chill: gauč východ, místo 2 – kotva na nábytku |
| 30 | `+` | (68, 13) | (274, 54) | zády (k tabuli) | ředitel u tabule úkolů (X) |
| 31 | `+` | (70, 19) | (282, 78) | čelem (k divákovi) | ředitel u skla, dívá se do kanceláře |
| 32 | `m` | (67, 15) | (270, 62) | zády (k tabuli) | porada v plan mode (tabule P a TV) |
| 33 | `m` | (69, 17) | (278, 70) | zády (k tabuli) | porada v plan mode (tabule P a TV) |
| 34 | `m` | (74, 18) | (298, 74) | zády (k tabuli) | porada v plan mode (tabule P a TV) |
| 35 | `v` | (68, 22) | (274, 90) | čelem (k divákovi) | stůl 19 (blok A, severní řada) |
| 36 | `v` | (75, 22) | (302, 90) | čelem (k divákovi) | stůl 20 (blok A, severní řada) |
| 37 | `^` | (68, 28) | (274, 114) | zády (od diváka) | stůl 21 (blok A, jižní řada) |
| 38 | `^` | (75, 28) | (302, 114) | zády (od diváka) | stůl 22 (blok A, jižní řada) |
| 39 | `v` | (68, 31) | (274, 126) | čelem (k divákovi) | stůl 23 (blok B, jen severní řada) |
| 40 | `v` | (75, 31) | (302, 126) | čelem (k divákovi) | stůl 24 (blok B, jen severní řada) |
| 41 | `+` | (76, 37) | (306, 150) | zády (k tiskárně) | tiskárna |
| 42 | `v` | (50, 42) | (202, 170) | čelem (telefonuje) | telefonní kóje 1 |
| 43 | `v` | (62, 42) | (250, 170) | čelem (telefonuje) | telefonní kóje 2 (větší) |
| 44 | `v` | (74, 42) | (298, 170) | čelem (telefonuje) | telefonní kóje 3 |
| 45 | `c` | (28, 23) | (114, 94) | – | dvojice na pokec A (1/2) |
| 46 | `c` | (32, 23) | (130, 94) | – | dvojice na pokec A (2/2) |
| 47 | `c` | (27, 29) | (110, 118) | – | dvojice na pokec B (1/2) |
| 48 | `c` | (31, 29) | (126, 118) | – | dvojice na pokec B (2/2) |
| 49 | `c` | (49, 34) | (198, 138) | – | dvojice na pokec C (1/2) |
| 50 | `c` | (53, 34) | (214, 138) | – | dvojice na pokec C (2/2) |

**Plochy na procházení (stroll) a náhodné pokecy**
- U1 chodba před bloky: sl 6–62 × ř 20–21 → x 24, y 80, 228×8 px
- U2 volná plocha mezi šuplíky, průhledem a chill zónou: sl 5–42 × ř 22–25 → x 20, y 88, 152×16 px
- U3 volná plocha mezi průhledem a chill zónou: sl 26–42 × ř 26–31 → x 104, y 104, 68×24 px
- U4 průchod vpravo od chill zóny: sl 60–64 × ř 21–38 → x 240, y 84, 20×72 px
- U5 pod chill zónou: sl 45–74 × ř 32–38 → x 180, y 128, 120×28 px
- U6 jen pro ředitele (zasedačka): sl 64–69 × ř 14–19 → x 256, y 56, 24×24 px

---

## 4. Mimo budovu

**Co je vlevo dole** (sl 0–44, ř 33–44). Na obou patrech **dvůr z foto 06**: dlažba z kočičích hlav `,`, vlevo zeď dvora s **bránou** (sl 0, ř 33–34) a **břečťanem** pod ní, **pivní set** (stůl `t` + 2 lavice `n`), květináč a na boční fasádě svislé části dva **modré bannery BlueGhost** `!` (bílý mrak nahoře, nápis a duch dole). Fasády `_`, `|` a zkosení se kreslí jako nízký seříznutý pruh (2–3 px) s tmavě hnědými rámy oken.
- **Přízemí:** dvůr ve stejné výšce jako podlaha a **pochozí** (ř 33–43, bez nábytku). Příchozí se objeví na `E` (1, 34) a dojdou po ř 33–34 ke dveřím na zkosení; odcházející jdou zpět a zmizí za bránou. Ve dveřích je nadsvětlík, uvnitř rohožka.
- **Horní patro:** stejný dvůr viděný o patro výš, jen dekorace (nepochozí, bez lidí, tmavší); na zkosení je okno, na fasádě nad průhledem okno s převislou rostlinou (sl ~13–20, ř 32).
- **Den a noc:** `skyFor(hour)` řídí tón dvora – ve dne slunce a stín budovy, večer oranžový nádech, v noci tmavě modrá, svítí lampa u vchodu a okna fasády vrhají teplé obdélníky na dlažbu. Nahoře mohou do kanceláře dopadat šikmé světelné kužely ze **světlíků**, ve dne teplé, v noci žádné; v přízemí ne.

**Přepínání pater:** levý dolní roh nad dvorem `U` = sl 1–6 × ř 41–43 → x 4, y 164, 24×12 px, mimo cestu příchozích. Dvě tlačítka se šipkou ▲ (horní patro) a ▼ (přízemí), každé zhruba 9×9 px, aktivní patro zvýrazněné; volitelně odznak s počtem lidí na druhém patře (např. „▼ 3“). Na stejném místě na obou patrech.

---

## 5. Kompromisy a předpoklady

1. **Proporce L:** vodorovná část má hloubku 20 řádků (ř 12–31), svislá část je široká 33 sloupců (132 px), dvůr 45×12 buněk; obrys je na obou patrech stejný.
2. **Menší přízemí:** zadní stěna je v přízemí na ř 20 (o 9 řádků dál než nahoře, zhruba hloubka zasedačky), místnosti za ní se nekreslí. V hale tak zbývá 6 řádků mezi zdí a schody: 2 řádky recepce a dveří, 4 řádky volné chodby.
3. **Zkosení = vchodové dveře:** 3 buňky šikmo (42, 32) → (44, 34), dveře ≈ 17 px.
4. **Šikmá příčka** začíná u **spodního** ostění vchodových dveří (44, 34) a vede 12 buněk až na ř 22 (přední hrana baru); nahoře ji uzavírá stolek se svačinou v rohu u zdi (57–59, 21–22).
5. **Průchod do klubovny** jsou 4 šikmé buňky uprostřed příčky (≈ 22 px).
6. **Bar** má 19 sloupců (sl 60–78): 5 barových židlí a 2 místa na kávu; levý konec u příčky zabírá stolek se svačinou a terč nad ním.
7. **Stolky v klubovně** jsou stále 3×3, ale mezi řadami stolků je jen 1 řádek uličky (přízemí je menší).
8. **Bobík** u věšáků má jen 5 řádků (ř 22–26) a 2 místa; **recepce** je 2 řádky hluboká.
9. **Zapuštěná zasedačka v přízemí** se nekreslí, jen šikmé prosklené dveře `Y` v rohu (56, 21); buňky (54–55, 21) před nimi jsou volné pro budoucí „nakouknutí“.
10. **Gaučík pod schody** leží uvnitř stopy schodiště (sl 8–15, ř 27–28); v mřížce je to nábytek, sedadla jsou kotvy dosažitelné z ř 26. Kreslit ho pod ramenem schodiště.
11. **Sloupy** stojí na obou patrech na (33–34, 29–30) a (39–40, 29–30): nahoře mezi průhledem a chill zónou, dole v hale před schody (cesta od vchodu ke schodům je kolem nich volná).
12. **Počet bloků u zadní stěny:** „4 bloky“ = 4 společné desky + navíc stůl u levé stěny (18 stolů), autor počet potvrdil.
13. **Stoly u zadní stěny** jsou 4×4 buňky (16×16 px, mělčí než ve v5), aby zbyla chodba ř 20–21 a volná plocha ř 22–25 před průhledem.
14. **Stoly v pravé části** jsou 7 buněk (28 px) široké, deska bloku A 5 řádků, bloku B 3 řádky; mezi bloky 2 řádky uličky, pod zasedačkou 1 řádek (jen k severní řadě A).
15. **Zasedačka nahoře** má poloviční šířku (sl 63–78, ř 12–20), takže tabule úkolů má přednost a menší tabule plan mode visí nad TV. Šikmý roh má 4 buňky (sklo, 2× dveře, sklo).
16. **Kóje:** 3 kusy, vnitřek 9 + 13 + 9 sloupců, hloubka 5 řádků, každá 1 sedadlo.
17. **Chill zóna** je 17×10 (sl 43–59, ř 22–31), křesla 4×2; od pravé části ji dělí průchod sl 60–64.
18. **Pavoučí lustry** jsou jen značky na podlaze (`*`, pochozí): 1 nad chill zónou, 5 po kanceláři, žádný nad stolem ani hned vedle něj.
19. **Malovaný duch** visí na zadní stěně nad blokem 3, protože boční stěny jsou v domečkovém pohledu vidět jen jako hrana.
20. **Místo u okna:** zadní stěna okna nemá, proto 2 místa u zábradlí průhledu čelem k fasádě s oknem (foto 03).
21. **Schodiště:** přímé rameno 17 sloupců × 5 řádků podél přední fasády; ve skutečnosti je delší (~4,3 m).
22. **Portrét zaměstnance týdne** visí nahoře vlevo na zadní stěně (jako dnes); **hodiny a panel limitů** jsou jen na TV nad recepcí v přízemí (autor potvrdil).
23. **Stolky v klubovně** mají po 2 židlích (sever/jih); **gauč v klubovně** je modrý, svislý, se 3 místy z profilu.
24. **Mléčné sklo** je nepochozí, aby ho nikdo nezakrýval.
25. **Dvůr** je na obou patrech stejný; pochozí je jen v přízemí.

---

## 6. Otázky pro autora

Otevřené otázky nejsou.

---

## 7. Pro další kroky

- **Zadní stěna v přízemí:** pás je v přízemí ř 0–20 (84 px), nahoře ř 0–11 (46 px). V přízemí kreslit stěnu v běžné výšce (ř 9–20: dveře WC a kuchyňky, TV nad recepcí, šikmé dveře `Y`, terč, LED duch nad barem) a nad ní pruh stropu (ř 0–8) **jen s trámy a svazky kabelů – bez oken a bez světlíků** (autor: okna v zadní zdi přízemí nedávají smysl). `FLOOR_Y` je per patro: nahoře 46, dole 84 (`createGrid` s `minY` = 86 dole).
- **Nová póza – sedící profil** vlevo/vpravo (18 stolů u zadní stěny, gauče v chill zóně, modrý gauč v klubovně, bobík); volitelně stojící profil (koše, šuplíky). `figure()` dnes umí jen `front`/`back`.
- **Šikmé stěny kreslit jako čáru, ne schody:** příčka v přízemí (45, 34) → (56, 22), zkosení vchodu, šikmý roh zasedačky nahoře. Dveře a průchody na nich kreslit šikmo (rám pod 45°); průchod do klubovny je široký, s černým rámem.
- **Gaučík pod schody:** kreslit tak, aby rameno schodů nad ním zůstalo vidět (sedící je pod šikmými stupni).
- **Monitory u zadní stěny** jsou vidět z boku: obrazovku (`screens.js`) kreslit jako úzký pruh nebo ve 3/4 pohledu. U severních řad bloků A a B je vidět zadní strana monitoru.
- **Dva gridy:** `createGrid` zvlášť pro každé patro. Doporučuji mapy z tohoto souboru parsovat přímo (znak → pochozí / překážka / místo; `*` je pochozí), ať je ASCII jediný zdroj pravdy; souřadnice místa = střed buňky (4·sl+2, 4·ř+2). V přízemí jsou pochozí i buňky dvora (ř 33–43), tři buňky vchodových dveří a čtyři buňky průchodu do klubovny.
- **Patro u entit:** každá osoba dostane `floor`; kreslí se jen lidé aktuálního patra a ti na schodech. `route()` jen v rámci patra; přechod = cesta k `Z`, animace schodů, cesta od `Z` na druhém patře.
- **Animace schodů:** v přízemí jde postava od `Z` (102, 118) doleva po stupních (x ≈ 98 → 34) a stoupá o ~40 px, pak zmizí stropem; nahoře se vynoří z otvoru na západním konci a vystoupí na `Z` (30, 118), oříznutá hranou podlahy. Doba ~2–3 s.
- **Příchod a odchod:** `DOOR` → `E` (6, 138) u brány; cesta ke stolu = E → vchodové dveře (174, 134) → Z dole → schody → Z nahoře → stůl (cca 170 + 75 + 70 + až 260 px, při `SPEED` 60 px/s ~10 s). Při odchodu opačně a zmizet za bránou.
- **claimSeat:** nejdřív 24 stolů nahoře; přetečení na stolky v klubovně (18 míst) nebo na gauče.
- **internSpot:** dnešní posuny (±14, +1 / 0, +10) počítají s pohledem zezadu; u profilových míst stavět stážisty do volných sloupců uličky mezi bloky (jsou 4) nebo na chodbu; u bloků A/B do průchodu sl 60–64.
- **Ředitel:** `OFFICE_AREAS` = zasedačka nahoře (U6), `OFFICE_SPOTS`: `board` (274, 54), `glass` (282, 78) místo `cabinet`; `TASK_BOARD` na zdi ≈ x 256, y 12, 36×28. `BOARD` (plan mode) = 3× `m`: (270, 62), (278, 70), (298, 74). Do zasedačky se chodí šikmými dveřmi (258, 74) / (262, 78).
- **IDLE_POOLS:** `coffee` → přízemí (`$`), `sofa` → obě patra (preferovat stejné patro; v přízemí i gaučík pod schody), `window` → nahoře (`w`). Nové možné pooly: 3 kóje (telefon), šipky, tiskárna, stolky a barové židle v klubovně, bobík, svačina/zmrzlina, WC, kuchyňka a zapuštěná zasedačka (člověk zmizí za dveřmi).
- **Sklo přes lidi:** skleněné stěny zasedačky nahoře (čelo ř 20, y 80–83, a šikmý roh) a sklo kójí kreslit přes postavy uvnitř (jako `drawGlassFront`).
- **Podlahy:** nahoře antracit `#45444a` a světlý ostrůvek chill zóny se zubatým okrajem; hala světlá hladká; klubovna dub `#b08a5e` (hranice podlahy kopíruje šikmou příčku); dvůr dlažba. Gauč v klubovně modrý.
- **Ověřeno skriptem:** obě mapy mají 45 řádků po 80 znacích; fasády, zkosení, boční fasáda a dvůr jsou na obou patrech buňka po buňce stejné; posunutá zadní stěna a šikmá příčka jsou jen v přízemí; v přízemí vede cesta z `E` přes dvůr a vchodové dveře do haly a ke schodům a do klubovny jen průchodem uprostřed příčky; nahoře z `Z` ke všem místům včetně 3 kójí a zasedačky; žádné místo neleží na nábytku, žádná pochozí buňka není odříznutá; každé sedadlo u stolu má stůl přesně před sebou a žádný za zády ani po boku; mezi židlemi zády k sobě jsou 4 volné buňky; nahoře je 18 + 4 + 2 = 24 sedadel u stolů a 6 lustrů (žádný u stolu), dole žádný.
