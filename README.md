# AI Office

Pixel-art kancelář, ve které se zaměstnanci objeví jen tehdy, když na počítači běží AI agent.
Každá session Claude Code = jeden zaměstnanec, každý subagent = stážista se zelenou kšiltovkou.

## Spuštění

```bash
npm install
npm run install-hooks   # zaregistruje hook v ~/.claude/settings.json (se zálohou)
npm start               # okno + ikona v menu baru
```

- `npm run install-app` – sestaví `AI Office.app` (ad-hoc podpis) a nainstaluje do `~/Applications`
- `npm run dist` – jen sestaví aplikaci do `dist/`
- `npm run demo` – přehraje ukázkový scénář do běžící aplikace (bez reálného agenta)
- `npm run uninstall-hooks` – odebere hooky (ostatní hooky zůstanou)
- Ikona v menu baru: klik = mini kancelář, pravý klik = menu (vždy navrchu, spouštět po přihlášení, demo, konec)
- Zavřením okna aplikace nekončí, běží dál v menu baru.

## Jak to funguje

```
Claude Code hook ──► hooks/office-hook.sh ──curl──► 127.0.0.1:4747/event ──IPC──► canvas
```

| Hook | Ve hře |
|---|---|
| `SessionStart` | zaměstnanec přijde do kanceláře |
| `UserPromptSubmit` | dostane úkol (žlutá bublina s promptem) |
| `PreToolUse` | pracuje: terminál, čtení, psaní kódu, web, MCP = telefon, TodoWrite = plánování |
| `PreToolUse` Agent/Task / `SubagentStop` | přijde / odejde stážista |
| `Notification` (povolení) | zvedne ruku, monitor bliká, zazní zvuk, v menu baru se objeví ❗ |
| `Stop` | „Hotovo ✓“ + zvuk, jde si pro kafe, na tabuli přibude čárka |
| `SessionEnd` | odchází domů |

**Volno:** když session čeká na tvůj vstup, zaměstnanec se fláká (čistě lokálně, žádné tokeny):
kafe u linky, televize na gauči, klábosení s dalším volným kolegou, surfování (videa, kočky), chvíle u stolu
a po 5 minutách nečinnosti i šlofík. Jakmile přijde práce, všeho nechá a vrátí se ke stolu.

**Limity předplatného:** `install-hooks` nastaví i `statusLine` (`hooks/office-statusline.sh`), pokud žádnou
vlastní nemáš. Claude Code jí předává `rate_limits` (5h okno a týden), skript je pošle do AI Office a v terminálu
vypíše `📁 složka · model · ⛽ 5h 77 % · týden 59 %`. V kanceláři je panel „5h / 7d“ pod hodinami a detail
s časem resetu ve spodní liště. Data přichází jen u předplatného Pro/Max a až po první odpovědi v session.

**Interakce a život v kanceláři**

- **Klik na zaměstnance** → přepne do jeho terminálu (Terminal.app a iTerm2 i na konkrétní záložku, ostatní aplikace
  jako Warp, PhpStorm a VS Code se jen aktivují). Hook kvůli tomu posílá TTY procesu Claude.
- **Notifikace macOS** (když okno kanceláře není v popředí): žádost o povolení, hotový úkol delší než 20 s, chyba API,
  povýšení. Klik na notifikaci přepne do terminálu. Vypínají se v menu ikony.
- **Stálí zaměstnanci**: každý projekt má svého člověka se jménem a kariérou (XP: +1 za nástroj, +10 za úkol;
  Junior → Medior → Senior → Lead → Ředitel). S úrovní přibývají brýle, kravata, sluchátka a oblek.
- **Statistiky** (klik na tabuli nebo portrét, nebo menu ikony): úkoly, odpracovaný čas, výplata a nástroje za dnešek
  a 7 dní. Na zdi visí portrét **zaměstnance týdne**. Data jsou v `~/Library/Application Support/ai-office/office-data.json`.
- **Plan mód** → porada u tabule s diagramem.
- **Chyba nástroje** → zaměstnanec se chytá za hlavu a z monitoru se kouří. **Došly tokeny** (`StopFailure`
  rate_limit nebo 0 % v limitech) → stávka s transparenty až do resetu.
- **Kontext** ze status line: čím plnější, tím víc hrnků na stole, od 75 % se potí. Cena session = výplata.
- **Život**: kočka Bajt (dá se pohladit), robotický vysavač v prázdné kanceláři, konfety při `git commit`/`push`,
  večer a v noci zhasnuto a svítí jen stoly, lampa a televize.

Hook běží na pozadí (~7 ms), nic nevypisuje a nikdy neblokuje Clauda. Bez spuštěné aplikace tiše selže.

**Jiné AI** (Codex, Gemini CLI, Aider, OpenCode, Cursor Agent) se detekují přes `ps` každých 5 s.
Podle zátěže CPU se odhaduje, jestli pracují nebo mají volno. Konkrétní nástroje u nich vidět nejsou.

## Konfigurace

- `AI_OFFICE_PORT` – port serveru (výchozí 4747), stejná proměnná platí pro hook
- `AI_OFFICE_SCREENSHOT=/cesta.png npm start` – přehraje demo, uloží screenshot a skončí (pro vývoj)
