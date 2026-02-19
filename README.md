# Facebook to Discord Notifier

Ši programa skirta stebėti Facebook puslapius ir siųsti pranešimus apie naujus įrašus į Discord kanalą.

## Architektūra

- **Frontend**: Next.js (Vercel) – Valdymo panelė.
- **Database**: Turso (SQLite) – Vartotojų ir puslapių informacija.
- **Worker**: GitHub Actions – Periodinis Puppeteer scraper'is (kas 4 val.).

## Kaip pradėti?

### 1. Duomenų bazė (Turso)

1. Užsiregistruokite [turso.tech](https://turso.tech).
2. Sukurkite naują duomenų bazę.
3. Nukopijuokite `TURSO_DATABASE_URL` ir `TURSO_AUTH_TOKEN`.
4. Turso SQL Editoriuje paleiskite `schema.sql` turinį.

### 2. Dashboard Deployment (Vercel)

1. Įkelkite šį projektą į savo **Public** GitHub repozitoriją (Public būtinas nemokamoms GitHub Actions minutėms).
2. Prijunkite repozitoriją prie Vercel.
3. Pridėkite šiuos Environment Variables:
    - `TURSO_DATABASE_URL`
    - `TURSO_AUTH_TOKEN`
    - `NEXTAUTH_SECRET` (Sugeneruokite bet kokią ilgą eilutę)
    - `NEXTAUTH_URL` (Jūsų Vercel svetainės adresas)

### 3. Worker Setup (GitHub Actions)

1. Savo GitHub repozitorijoje eikite į **Settings** -> **Secrets and variables** -> **Actions**.
2. Pridėkite šiuos Secrets:
    - `TURSO_DATABASE_URL`
    - `TURSO_AUTH_TOKEN`
    - `DISCORD_WEBHOOK_URL` (Numatytasis Discord Webhook adresas)
    - `FB_COOKIES` (Jūsų Facebook cookies JSON formatu – tai leidžia apeiti Login wall).

#### Kaip gauti FB_COOKIES?

Naudokite naršyklės plėtinį (pvz., "EditThisCookie" arba "Cookie-Editor"), eksportuokite cookies kaip JSON, kol esate prisijungę prie Facebook.

## Naudojimas

1. Prisijunkite prie savo Dashboard (naudokite `src/lib/setup-user.ts` sugeneruoti pirmajam vartotojui).
2. Pridėkite Facebook puslapius, kuriuos norite sekti.
3. Kiekvieną kartą, kai GitHub Action paleidžia scraper'į (kas 4 val.), nauji postai bus išsiųsti į Discord.
