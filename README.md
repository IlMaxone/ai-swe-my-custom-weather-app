# App Meteo

Una semplice applicazione meteo in Node.js che consente agli utenti di inserire il nome di una città e recuperare informazioni meteorologiche aggiornate tramite le API di Open-Meteo.

L'app recupera:
- temperatura
- velocità del vento
- umidità

Include anche:
- gestione degli errori per città non valide
- logging delle risposte in un file di log

---

## Panoramica del progetto

Questa applicazione permette all'utente di cercare il meteo di una città inserendone il nome.  
Il flusso principale è il seguente:

1. l'utente inserisce il nome della città
2. l'app utilizza l'API di geocodifica di Open-Meteo per ottenere le coordinate
3. l'app usa le coordinate per richiedere i dati meteo
4. i risultati vengono mostrati in output
5. le risposte e gli eventuali errori vengono registrati in un file di log

L'obiettivo del progetto è offrire un esempio semplice ma pratico di utilizzo di API esterne, gestione degli errori e logging in Node.js.

---

## Funzionalità

- Ricerca meteo tramite nome città
- Geocodifica automatica con Open-Meteo
- Recupero di:
  - temperatura
  - velocità del vento
  - umidità
- Gestione degli errori per input non validi o città non trovate
- Logging delle risposte API in un file di log
- Struttura semplice e adatta a scopo didattico

---

## Tecnologie utilizzate

- Node.js
- API Open-Meteo Geocoding
- API Open-Meteo Forecast
- File system di Node.js per il logging

---

## Installazione

### 1. Clona il progetto

```bash
git clone <repository-url>
```

### 2. Installa le dipendenze

Dalla cartella `main` del progetto installa le dipendenze necessarie:

```bash
npm install
npm install express dotenv
```

> `express` serve per avviare il webserver locale che espone le API e la UI web.
> `dotenv` serve per caricare le variabili d'ambiente dal file `.env`.

### 2.1 Configura il file `.env`

Crea un file `.env` nella cartella `main` del progetto con un contenuto simile a questo:

```env
ENABLE_WEATHER_API=true
ENABLE_AIR_QUALITY_API=true
WEATHER_API_KEY=
AIR_QUALITY_API_KEY=
PORT=3000
```

Nel progetto attuale le API usate sono pubbliche. Le variabili `WEATHER_API_KEY` e `AIR_QUALITY_API_KEY` sono quindi lasciate vuote, mentre i flag `ENABLE_WEATHER_API` e `ENABLE_AIR_QUALITY_API` permettono di attivare o disattivare le chiamate.

Comportamento previsto:

- `ENABLE_WEATHER_API=true` → abilita le chiamate meteo
- `ENABLE_WEATHER_API=false` → disabilita le chiamate meteo
- `ENABLE_AIR_QUALITY_API=true` → abilita le chiamate qualità dell'aria
- `ENABLE_AIR_QUALITY_API=false` → disabilita le chiamate qualità dell'aria

### 2.2 Controlli utili da terminale

Dalla cartella `main` puoi usare questi controlli rapidi:

Verifica che i file principali esistano:

```bash
ls
ls UI
```

Controlla la sintassi dei file JavaScript principali:

```bash
node -c weather.js
node -c app.js
node -c server.js
```

Controlla che le variabili d'ambiente siano caricate correttamente:

```bash
node -e "require('dotenv').config(); console.log({ ENABLE_WEATHER_API: process.env.ENABLE_WEATHER_API, ENABLE_AIR_QUALITY_API: process.env.ENABLE_AIR_QUALITY_API, WEATHER_API_KEY: process.env.WEATHER_API_KEY, AIR_QUALITY_API_KEY: process.env.AIR_QUALITY_API_KEY, PORT: process.env.PORT })"
```

Controlla che gli export di `weather.js` siano disponibili:

```bash
node -e "const weather = require('./weather'); console.log(Object.keys(weather))"
```

Controlla se la porta 3000 è già occupata:

```bash
lsof -i :3000
```

Controlla se il server risponde sulla root API meteo corrente:

```bash
curl "http://localhost:3000/api/weather/current?city=Milano"
```

Controlla se il server risponde sulla previsione a 5 giorni:

```bash
curl "http://localhost:3000/api/weather/forecast?city=Milano"
```

### 3. Avvia il webserver

Per avviare il server locale:

```bash
node server.js
```

Se il server parte correttamente, vedrai un output simile a questo:

```text
Server avviato su http://localhost:3000
UI disponibile su http://localhost:3000/weather-ui.html
```

### 4. Apri la UI nel browser

Apri questo indirizzo nel browser:

```text
http://localhost:3000/weather-ui.html
```

### 5. Arresta il webserver

Su macOS, se il server è stato avviato nel terminale corrente, puoi fermarlo con:

```bash
Ctrl + C
```

Se invece il processo è rimasto attivo e vuoi chiuderlo manualmente, puoi individuare il processo che occupa la porta 3000 con:

```bash
lsof -i :3000
```

Poi terminare il processo usando il PID restituito:

```bash
kill -9 <PID>
```

---

## Best practice

### Variabili d'ambiente

- Non salvare chiavi reali direttamente nei file `.js`
- Usa sempre il file `.env` per configurazioni locali
- Aggiungi `.env` al `.gitignore` per evitare commit accidentali
- Tieni un file `.env.example` con i nomi delle variabili ma senza valori reali

Esempio di `.env.example`:

```env
ENABLE_WEATHER_API=true
ENABLE_AIR_QUALITY_API=true
WEATHER_API_KEY=
AIR_QUALITY_API_KEY=
PORT=3000
```

### Avvio e debug

- Avvia sempre il server dalla cartella `chatgpt`
- Se cambi `weather.js`, `server.js` o `.env`, riavvia il server Node
- Se vedi dati vecchi, ricorda che il progetto usa la cache lato backend
- Se una chiamata restituisce `N/A`, controlla prima `.env`, poi i flag `ENABLE_WEATHER_API` / `ENABLE_AIR_QUALITY_API`, poi la risposta delle API e infine la cache

### Controlli rapidi consigliati

Per una diagnosi rapida, esegui in ordine:

```bash
node -c weather.js
node -c app.js
node -c server.js
node -e "require('dotenv').config(); console.log({ ENABLE_WEATHER_API: process.env.ENABLE_WEATHER_API, ENABLE_AIR_QUALITY_API: process.env.ENABLE_AIR_QUALITY_API, PORT: process.env.PORT })"
node server.js
```

Poi in un secondo terminale:

```bash
curl "http://localhost:3000/api/weather/current?city=Milano"
curl "http://localhost:3000/api/weather/forecast?city=Milano"
```

### Sicurezza minima consigliata

Anche se nel progetto attuale le API possono essere pubbliche:

- non mettere segreti nel frontend
- non esporre chiavi nel browser
- gestisci sempre le chiamate API dal backend quando usi provider con autenticazione
- non loggare chiavi o token nei messaggi di debug
---

## Licenze e uso commerciale

### Dipendenze software principali

Il progetto usa principalmente:

- **Node.js**
- **Express**
- **dotenv**
- **Open-Meteo** per geocoding, meteo e qualità dell'aria

### Compatibilità commerciale delle librerie software

Le librerie software principali usate dal progetto sono in generale compatibili con uso commerciale:

- **Node.js**: licenza **MIT**
- **Express**: licenza **MIT**
- **dotenv**: licenza **BSD-2-Clause**

Queste licenze sono permissive e consentono in generale uso commerciale, modifica e distribuzione del software, mantenendo gli avvisi di copyright e licenza dove richiesto.

### Attenzione al provider dati

Il punto più delicato per un uso commerciale non è il codice Node/Express/dotenv, ma il servizio dati scelto.

Il progetto usa endpoint pubblici di **Open-Meteo**. Prima di un uso commerciale in produzione è necessario verificare i termini aggiornati del provider, eventuali limiti d'uso, requisiti di attribuzione e disponibilità di piani commerciali.

### Conclusione pratica

- Il codice applicativo e le librerie Node/Express/dotenv sono adatti a uso commerciale
- Prima di una messa in produzione commerciale va verificata la conformità dei termini del provider dati meteo
- Se il progetto cresce, conviene documentare nel repository le licenze delle dipendenze e i termini del provider API scelto