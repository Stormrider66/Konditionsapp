# Multivariat Analys (MVA) — PCA & PLS för Lag

## Översikt

Multivariat analys (MVA) är ett kraftfullt verktyg för coacher som vill förstå komplexa samband mellan atleters fysiologi, träning, hälsa och prestation. Trainomics implementerar två kompletterande metoder:

- **PCA (Principal Component Analysis)** — Mönsteranalys som identifierar hur atleter grupperas och vilka variabelkombinationer som förklarar mest variation i laget.
- **PLS (Partial Least Squares Regression)** — Drivkraftsanalys som visar vilka faktorer som bäst förutsäger en specifik utfallsvariabel, till exempel beredskap, ACWR eller prestation.

## Tillgängliga variabler

Systemet samlar automatiskt data från ~85 variabler i 10 kategorier:

### Fysiologiska (10+)
- VO2max, LT1/LT2 puls och hastighet/effekt, maxpuls, vilopuls, max laktat
- Kritisk effekt (CP), W' (anaerob kapacitet), ergometer topp- och snitteffekt

### Kroppssammansättning (7)
- Vikt, kroppsfett%, muskelmassa, BMI, FFMI, kroppsvätska%, visceralt fett

### Träningsbelastning (4)
- Daglig belastning, akut belastning, kronisk belastning, ACWR

### Daglig uppföljning (8)
- HRV, sömnkvalitet och timmar, ömhet, trötthet, stress, beredskap, välmående

### Prestation (12+)
- Tävlings-VDOT, tävlingspuls, LT-separation, träningspass, RPE, följsamhet
- Sprint 20m/10m, agility T-test, max sprinthastighet, Yo-Yo IR1, beep-test
- Sprinttid och maxhastighet från timing gates, COD-deficit

### Styrka & Kraft (9+)
- Snitt 1RM, styrka-RPE, platåveckor, styrkepass, relativ styrka
- CMJ hopphöjd, stående längdhopp, hopp relativ effekt (W/kg)

### Återhämtning & Rörelse (6)
- Humör, motivation, aktiva skador, korsträning
- Rörelsescreening poäng (FMS/DMS), rörelseasymmetri

### Löpteknik (6)
- Stegfrekvens, markkontakttid, vertikal oscillation, steglängd, asymmetri%, löpteknikpoäng

### Integrationer (6)
- Strava distans/aktiviteter/puls, Garmin träningseffekt/distans, Concept2 pass

### Trender (6)
- HRV-trend, HRV-variabilitet (CV), sömnkvalitet-trend, trötthets-trend, belastnings-trend, beredskaps-trend

## PCA — Mönsteranalys

### Vad PCA gör
PCA komprimerar alla variabler till ett fåtal "principalkomponenter" (PC) som fångar de viktigaste variationsmönstren i laget. Det visar:

- **Score Plot**: Hur atleter positionerar sig relativt varandra. Atleter nära varandra har liknande profiler.
- **Loading Plot**: Vilka variabler som driver respektive komponent. Variabler nära varandra korrelerar.
- **Hotelling's T²**: Identifierar atleter med ovanliga profiler (outliers).
- **DModX**: Visar hur väl varje atlets data passar modellen.

### Tolkning
- **PC1** fångar den största variationen — ofta en "övergripande kondition/belastning"-dimension.
- **PC2** fångar näst mest — ofta en "balans mellan styrka och uthållighet"-dimension.
- Atleter långt från centrum har unika profiler som kan behöva individuell uppföljning.
- Variabelgrupper som klustrar visar starka samband (t.ex. HRV och sömnkvalitet).

### Diagnostik
- **Hotelling's T² > 95%**: Atlet med ovanlig profil — inte nödvändigtvis negativt, men värt att undersöka.
- **Hög DModX**: Atletens data passar inte modellens mönster — kan indikera brusig data eller en unik situation.

## PLS — Drivkraftsanalys

### Vad PLS gör
PLS svarar på frågan: "Vilka faktorer driver [Y-variabeln] mest?" Till exempel:
- Vilka faktorer påverkar lagets beredskap mest?
- Vad driver variationen i ACWR?
- Vilka variabler förutsäger sprint-prestation?

### VIP-poäng (Variable Importance in Projection)
- **VIP > 1.0**: Variabeln har en viktig inverkan på Y — dessa är "nyckeldrivkrafterna".
- **VIP 0.8–1.0**: Marginellt viktiga variabler.
- **VIP < 0.8**: Svag koppling till utfallsvariabeln.
- **Koefficient-tecken**: Positiv koefficient = ökning i X ger ökning i Y. Negativ = omvänt.

### Modellkvalitet
- **R²Y (Förklaringsgrad)**: Andel av Y-variationen som modellen förklarar.
  - \> 80%: Utmärkt modell
  - 50–80%: God modell
  - < 50%: Svag modell — Y kan bero på faktorer utanför datasetet
- **Q² (Korsvaliderad R²)**: Modellens förmåga att förutsäga nya observationer (LOO cross-validation).
  - Q² nära R²Y: Robust modell
  - Q² mycket lägre än R²Y: Överanpassning — modellen hittar mönster som inte generaliserar

### Observerat vs. Predikterat
- Punkter nära diagonalen (y=x) indikerar god modellpassning.
- Atleter långt från diagonalen har atypiska värden som modellen missar.
- Färg indikerar residualens storlek — röda punkter har störst avvikelse.

## Praktiska användningsfall

### Lagöversikt med PCA
1. Kör PCA med alla tillgängliga variabler
2. Identifiera kluster — har du undergrupper i laget?
3. Undersök outliers — behöver någon individuell anpassning?
4. Titta på loading plot — vilka variabler hänger ihop?

### Beredskapsdrivare med PLS
1. Välj "Beredskap (snitt)" som Y-variabel
2. Kör PLS med alla X-variabler
3. VIP > 1.0 visar vad som driver beredskapen mest
4. Positiva koefficienter = ökning hjälper beredskapen
5. Agera på de viktigaste drivkrafterna

### Sprint-prestation med PLS
1. Välj "Sprint 20m bästa" som Y-variabel
2. Inkludera styrke-, kraft-, kost- och belastningsvariabler
3. Se vilka träningsfaktorer som korrelerar med snabbare sprinttider
4. Anpassa programmet baserat på insikterna

## Krav och begränsningar

- **Minimum 8 atleter** i laget (statistisk stabilitet)
- **Minimum 3 variabler** med tillräcklig datatäckning (>60%)
- Atleter med <50% datatäckning exkluderas automatiskt
- Saknade värden imputeras med kolumnmedelvärde
- Data centreras och skalas till enhetsvarians (UV-skalning, SIMCA-standard)

## AI-insikter

Om coachen har konfigurerade AI-nycklar genereras automatiska insikter på svenska:
- Sammanfattning av modellens viktigaste fynd
- Lista över nyckeldrivkrafter med förklaring
- Konkreta rekommendationer baserade på data

AI-insikterna är ett komplement till graferna — inte en ersättning för coachens expertbedömning.
