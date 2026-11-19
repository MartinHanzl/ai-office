# Chat v AI Office – zadání dalších vylepšení

Předává se do jiné session. Popisuje, *co* má vzniknout a v jakém kontextu; způsob řešení je na implementátorovi.

## Kontext

AI Office je Electron aplikace: pixel-art kancelář, ve které každý běžící Claude Code session je zaměstnanec.
Vedle kanceláře je panel s chatem, kterým uživatel řídí sessions přímo z kanceláře (jako Claude desktop,
ale uvnitř hry). Pod kapotou běží pro každou session `claude -p --input-format stream-json --output-format stream-json`
(`src/agent.js`), odpovědi se parsují do položek konverzace (`src/stream-events.js`) a renderer je kreslí
Preactem bez buildu (`renderer/src/chat/`). Hooky Claude Code (`hooks/office-hook.sh`) hlásí dění do kanceláře.

Stav po commitu `28b43aa` (feature/office-chat), tj. hotovo a neřešit znovu:
- seznam všech Claude konverzací (desktop, terminál, kancelář) z `~/.claude/projects` s názvy, přejmenováním,
  archivací a hledáním (`src/conversations.js`, `renderer/src/chat/list.js`)
- model a effort per session, drafty, fork/rewind u každé zprávy, odpověď do cizí konverzace = kopie
- pročištěný přepis (skryté skilly, system-remindery, hooky; nástroje se sbalitelným vstupem/výstupem, thinking)
- vlastník konverzace se pamatuje, při obsazení zaskočí kolega („zastupuje …“)
- opravené drobnosti: drafty per konverzace, `seconds()`, klíče položek, `breaks: false`, zakázané `img`,
  dialog nejde zavřít během zadávání, asynchronní čtení přepisů, názvy MCP nástrojů bez uuid

Testy: `npm test` (lint, unit přes node:test, smoke test spouštějící Electron s `scripts/fake-claude.js`).
V repu může souběžně pracovat jiná session, sdílené soubory (`src/main.js`, `README.md`, `renderer/style.css`,
`scripts/smoke.js`) editovat jen cíleně.

## Rozhodnutí (potvrzeno uživatelem 2026-11-10)

1. **Přejmenování konverzace** zůstává jen lokálně (`conversations.json`), jako v Claude desktopu – do přepisu se nic nezapisuje.
2. **Rewind** vrací jen konverzaci, soubory se neobnovují.
3. **Automatické názvy** přes jeden levný dotaz na Haiku zůstávají.

## Priorita 1 – hotovo (`994eb9e` na feature/office-chat)

### 1. Povolovací karta a odpovědi agentovi (pracnost L)
Dnes se každý `control_request` z Claude Code v `src/agent.js` `onLine()` zamítne („AI Office tohle zatím neumí“)
a uživatel se o tom dozví až na konci tahu z `permission_denials`. Chat je tedy použitelný jen v režimu `auto`.
Má vzniknout:
- karta v konverzaci, když nástroj potřebuje povolení: co chce udělat (nástroj + vstup), tlačítka
  Povolit / Vždy v této session / Zamítnout (s důvodem); odpověď se pošle zpět do procesu
  (`--permission-prompt-tool stdio`, `control_response` s `behavior` / `updatedInput` / `message`, ověřit proti aktuální verzi CLI)
- tatáž karta pro `AskUserQuestion` (otázky a volby agenta) a pro `ExitPlanMode` (plán renderovaný markdownem, tlačítko Schválit)
- propojení s kanceláří: zaměstnanec už zvedá ruku, v tray je ❗ a chodí notifikace; klik na notifikaci / postavičku
  má skočit přímo na kartu

### 2. Diff a vnořená konverzace v rozbaleném nástroji (M)
Řádek nástroje už jde rozbalit a má `input`/`output`. Doplnit: u Edit/MultiEdit řádkový diff (old/new barevně),
u Write náhled souboru, u Grep/Glob počet shod, u TodoWrite checklist, u Agent/Task vnořená konverzace stážisty
(dnes `src/stream-events.js apply()` vše s `parent_tool_use_id` / `isSidechain` zahazuje). Panel je úzký,
souvisí s tahací šířkou (viz níže).

### 3. Hlavička session: režim, cena, kontext a akce nad projektem (S)
V hlavičce ukázat řádek „model · režim povolení · cena session · kontext %“ (data jsou: `summary().mode`,
`cost`, `w.context` v rendereru) a varování, když režim není `auto`/`bypass` (dokud není bod 1).
Vedle názvu projektu menu: Otevřít ve Finderu / v editoru / v terminálu a **Převzít do terminálu**
(ukončí proces v kanceláři a nabídne `claude --resume <id>` do terminálu nebo schránky; postavička „odejde k terminálu“).

### 4. Esc, přerušení a fronta zpráv (S)
- při práci Clauda má Esc (nebo ⌘.) ve složeném poli přerušit tah (`chat.stop`), až druhý Esc zavírá panel
- „■ Zastavit“ má dát zpětnou vazbu „Zastavuji…“ (interrupt → po 4 s SIGTERM v `agent.js stop()`)
- zpráva poslaná během práce se dnes hned zapíše jako odeslaná, ač čeká: označit „⏳ ve frontě“ s možností
  upravit/smazat, dokud ji Claude nevezme; a vyjasnit, co se s frontou stane po Zastavit

### 5. „↓ Nové zprávy“ a nepřečteno (S)
Při odscrollování nahoru plovoucí tlačítko „↓ nové zprávy“; po odeslání vlastní zprávy se seznam připne dolů.
V seznamu konverzací a na jmenovce v kanceláři (`renderer/src/draw/overlay.js`) tečka „má hotovo / čeká na tebe“
pro sessions, jejichž panel není otevřený (dnes to dělá jen macOS notifikace, a jen když okno není v popředí).

## Priorita 2 – další nápady

### Přepis
- časové značky zpráv na hover (přepis má `timestamp`, stream lze razítkovat v `apply`)
- cena a trvání tahu u konce tahu (`done.cost` je dnes kumulativní, ukázat deltu)
- tlačítko Kopírovat u bloků kódu a zvýraznění syntaxe (např. highlight.js z node_modules, bez buildu jako `marked`)
- klikací cesty k souborům relativně k cwd (`src/x.js:42`) → otevřít v editoru (nastavitelný příkaz);
  dnes nehttp odkazy tiše nic nedělají
- lehký markdown i v uživatelských zprávách (dnes prostý text)

### Composer
- obrázky: vložení ze schránky / drop → `image` blok ve stream-json; drop souboru → `@cesta`
- `@` doplňování souborů (git ls-files v cwd), `/` doplňování skillů a commandů
- přepínač plan módu (jako ⇧Tab v CLI), ladí s poradou u tabule v kanceláři
- šipka nahoru v prázdném poli = historie vlastních zpráv

### Více konverzací a okno
- záložky běžících sessions nahoře v panelu (⌘1–9), nebo vysunutí konverzace do vlastního okna se stejným kódem
- tahací šířka panelu s uložením (dnes `clamp(380px, 40vw, 640px)`); nutné pro diffy
- mini-office popover (COMPACT režim) má dnes chat vypnutý: aspoň „2 čekají na tebe“ a rychlé povolení/odpověď

### Propojení s kanceláří
- klik na stážistu spravované session → vnořená konverzace subagenta; klik na zvednutou ruku → karta s povolením
- toast v otevřené konverzaci „Petr (projekt) má hotovo → otevřít“, když skončí jiná session

### Chyby a onboarding
- po pádu procesu (`agent.js fail()`) tlačítko „Zkusit znovu“ (znovu pošle poslední zprávu); nenalezený `claude` → odkaz na instalaci
- první start session trvá až 8 s (`loginEnv()`), stav má říkat „spouští se claude…“, ne „pracuje…“
- prázdný seznam: nabídnout příklady promptů

### Přístupnost
- `aria-label` u tlačítek jen s emoji, `aria-modal` a focus trap v dialozích, vrácení fokusu po zavření,
  svázané `<label>` v dialogu Nový úkol
- `aria-live` pro streamovaný text a stav, kontrast šedých textů (`#566c86` na `#1a1c2c`), `prefers-reduced-motion`

## Priorita 3 – zbytky z review kódu
- v seznamu konverzací při klávesové navigaci scrollovat vybranou položku do zobrazené oblasti
- legenda ikon stavu/zdroje je jen v `title`, přidat viditelnou
- „🏠 Domů“ přejmenovat na srozumitelnější „Ukončit session“ (nebo doplnit text)
- řádek nástroje: dlouhé `server · nástroj` u MCP nezkracovat přes ikonu stavu
- rewind zkrácené (dlouhé vložené) zprávy vloží do pole jen zkrácený text
- u největších konverzací jde přes IPC ~840 KB položek najednou; zvážit stránkování nebo lazy načtení starších položek
