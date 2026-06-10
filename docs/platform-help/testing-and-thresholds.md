# Testing and Thresholds

How to run physiological tests, how lactate thresholds are detected, and how training zones, economy values, and reports are produced.

## What it is

The platform's testing module turns lab and field test data into actionable training metrics. The core is the lactate step test (running, cycling, or skiing): you enter the stages of an incremental test and the platform detects the aerobic threshold (LT1) and anaerobic threshold (LT2), builds individual training zones, and generates a report. Separate test categories cover body composition, power, speed, agility, strength, swimming, endurance field tests, HYROX, hockey batteries, and ergometer tests.

## Where to find it

- (Coaches) **Tools → Test** opens the test entry hub. Choose the athlete, pick a category tab (Lactate, Body Composition, Power, Speed, Agility, Strength, Swimming, Endurance, HYROX, Hockey), and enter the data. Saved lactate tests are listed under **Tests**, with an overview across athletes under **Test Overview**. Ergometer testing has its own page, **Tools → Ergometer Tests**.
- (Athletes) **Tests** in the athlete area lists your test history; open a test to see thresholds, zones, charts, and export a PDF report.

## How it works

**Creating a lactate test (Coaches).** Select the test type — **Running**, **Cycling**, or **Skiing** — and enter the stages in the order they were performed. Each stage records intensity (speed in km/h for running, power in watts for cycling, pace for skiing), heart rate, lactate, and optionally VO2. Stages are always evaluated in their entered order.

**Validation.** Stage values are hard-enforced on both create and edit: lactate must be 0–30 mmol/L and heart rate 40–250 bpm — values outside these ranges cannot be saved. If lactate *decreases* between stages, you get a warning ("Lactate dropped by X mmol/L from stage A to stage B — check sampling, timing, and values"), but the test still saves; the warning also appears in the calculation results so you can judge curve quality before acting on the thresholds.

**Threshold detection.** The platform first classifies the athlete's lactate-curve profile (e.g. an elite "flat curve" vs a standard rising curve) and then picks the most reliable method:

- **Anaerobic threshold (LT2):** Elite flat curves use **Modified D-max (Bishop)**, which anchors the baseline at the point before the first clear lactate rise. Standard curves use **Smart D-max**, which fits the curve two ways (heart-rate-based and intensity-based) and keeps the fit with the best R². D-max needs at least 4 valid stages. If D-max is unavailable or implausible, the platform falls back to the **Dickhuth** method (minimum lactate equivalent + 1.5 mmol/L), and as a last resort to the classic fixed **4.0 mmol/L** point found by **linear interpolation** between the two bracketing stages. Importantly, if the curve crosses 4.0 twice (common when the first stages start high before settling), the **second crossing** is used — not the first.
- **Aerobic threshold (LT1):** Elite flat curves use a dedicated ensemble detection (with a sanity cap around 2.5 mmol/L); otherwise D-max is used when it lands in the 1.5–2.5 mmol/L range, with a fallback of linear interpolation at **2.0 mmol/L**.
- **Manual override:** The test leader can set LT1/LT2 manually; manual values always take priority over the automatic methods.

Every threshold result is reported with the method used and a confidence level, and the lactate-curve visualization shows the fitted D-max analysis.

**Training zones.** Tests produce a 5-zone model anchored on the detected thresholds: Zone 1 recovery (below LT1), Zone 2 aerobic base (around LT1), Zone 3 tempo (between LT1 and LT2), Zone 4 threshold (around LT2), and Zone 5 VO2max (above LT2 up to max). Zones from a lactate test carry high confidence; without a test, estimated zones are used and flagged as such.

**Economy.** For stages where both VO2 and speed were recorded, running economy is calculated per stage. Stages missing VO2 data are simply skipped — they don't block the rest of the analysis.

**Ergometer testing.** The Ergometer Tests page supports Wattbike, Concept2 RowErg, SkiErg, and BikeErg, and air bikes (Assault, Echo, Schwinn). Protocols include peak-power tests (6-second, 7-stroke, 30-second Wingate-style), time trials (1000 m, 2000 m, 10-minute max calories, 20-minute FTP), an incremental MAP ramp, critical-power tests (3-minute all-out and multi-trial), and a 4×4-minute interval test. Results feed critical-power analysis, benchmarks, and predictions.

**Results and PDF export.** Athletes see each saved test under their Tests page with thresholds, zones, and charts, and can export the full report as a PDF. Coaches can do the same from the test detail page and email reports. Note: PDF export can time out on slow connections for very large reports.

## Common questions

**Q: Why is the anaerobic threshold not exactly at 4.0 mmol/L?**
A: 4.0 mmol/L is only the last-resort method. The platform prefers individualized methods (D-max variants, Dickhuth) that follow the athlete's own curve shape — elite athletes often have LT2 well below 4.0, recreational athletes sometimes above.

**Q: My athlete's lactate went down between two stages — is the test invalid?**
A: Not necessarily. Small drops can be normal (sampling variation, warm-up effects), so the platform warns instead of blocking. Review the flagged stages; if the drop is large, consider the threshold confidence rating before basing training on it.

**Q: Why does the report say a threshold was found at the "second crossing" of 4 mmol/L?**
A: If early stages start with elevated lactate that then settles, the curve can cross 4.0 twice. The second, definitive crossing reflects the true threshold; the first is a warm-up artifact.

**Q: Why are some stages missing from the economy analysis?**
A: Economy requires VO2 data. Stages recorded without VO2 are skipped from economy calculations but still count for threshold detection.

**Q: Why won't my stage save?**
A: Lactate must be between 0 and 30 mmol/L and heart rate between 40 and 250 bpm. These limits are enforced when creating and editing tests.

**Q: How many stages do I need?**
A: Threshold interpolation works with few stages, but the D-max methods need at least 4 valid stages — more stages give a better curve fit and higher confidence.

## Related features

- Zones from tests drive program intensities — see *Training Programs*.
- Test entry lives in the coach Tools menu — see *Getting Started: The Coach Dashboard*.
- Load tracking after testing — see *Training Load and ACWR*.
