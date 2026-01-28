const PptxGenJS = require("pptxgenjs");

// Create presentation
const pptx = new PptxGenJS();

// Set presentation properties
pptx.author = "Star Performance Lab";
pptx.title = "Star Performance Lab - Pitch Deck";
pptx.subject = "Seed Round Investment Deck";
pptx.company = "Star Performance Lab";

// Define colors
const colors = {
  primary: "6366F1",
  primaryDark: "4F46E5",
  secondary: "0EA5E9",
  accent: "10B981",
  dark: "0F172A",
  gray: "64748B",
  light: "F8FAFC",
  white: "FFFFFF",
  red: "DC2626",
};

// Slide master options
const masterOptions = {
  title: "MASTER_SLIDE",
  background: { color: colors.white },
};

// ============================================
// SLIDE 1: Title
// ============================================
let slide = pptx.addSlide();
slide.background = { color: colors.dark };

slide.addText("Star Performance Lab", {
  x: 0.5,
  y: 2.5,
  w: "90%",
  h: 1,
  fontSize: 54,
  bold: true,
  color: colors.primary,
  align: "center",
});

slide.addText("The Operating System for Elite Athletic Performance", {
  x: 0.5,
  y: 3.5,
  w: "90%",
  h: 0.5,
  fontSize: 22,
  color: colors.gray,
  align: "center",
});

slide.addShape(pptx.ShapeType.roundRect, {
  x: 3.5,
  y: 4.3,
  w: 3,
  h: 0.6,
  fill: { type: "solid", color: colors.dark },
  line: { color: colors.secondary, pt: 2 },
});

slide.addText("Seed Round - $2.5M", {
  x: 3.5,
  y: 4.35,
  w: 3,
  h: 0.5,
  fontSize: 16,
  color: colors.secondary,
  align: "center",
});

slide.addText("January 2026 | Confidential", {
  x: 0.5,
  y: 5,
  w: "90%",
  h: 0.3,
  fontSize: 12,
  color: colors.gray,
  align: "center",
});

// ============================================
// SLIDE 2: The Problem
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "The ", options: { color: colors.dark } },
  { text: "Problem", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

const painPoints = [
  { icon: "📊", title: "Fragmented Data", desc: "Coaches juggle 5-8 different apps to track athlete performance" },
  { icon: "⏱️", title: "Manual Reporting", desc: "4+ hours spent creating each athlete performance report" },
  { icon: "🔌", title: "No Integration", desc: "Garmin, Strava, and lab data exist in separate silos" },
  { icon: "📋", title: "Generic Programs", desc: "Cookie-cutter training plans ignore individual physiology" },
];

painPoints.forEach((point, i) => {
  const y = 1.2 + i * 0.9;
  slide.addText(point.icon, { x: 0.5, y, w: 0.5, h: 0.4, fontSize: 24 });
  slide.addText(point.title, { x: 1.1, y, w: 3.5, h: 0.3, fontSize: 14, bold: true, color: colors.red });
  slide.addText(point.desc, { x: 1.1, y: y + 0.3, w: 3.5, h: 0.4, fontSize: 11, color: colors.gray });
});

// Stats box
slide.addShape(pptx.ShapeType.roundRect, {
  x: 5.2,
  y: 1.2,
  w: 4.3,
  h: 2.5,
  fill: { color: colors.dark },
  shadow: { type: "outer", blur: 10, offset: 3, angle: 45, opacity: 0.3 },
});

slide.addText("The Real Cost", { x: 5.4, y: 1.4, w: 4, h: 0.4, fontSize: 18, bold: true, color: colors.white });
slide.addText("68%", { x: 5.4, y: 1.9, w: 4, h: 0.6, fontSize: 36, bold: true, color: "F87171" });
slide.addText("of coaches feel overwhelmed by admin tasks", { x: 5.4, y: 2.5, w: 4, h: 0.4, fontSize: 11, color: colors.gray });
slide.addText("$15K+", { x: 5.4, y: 3, w: 4, h: 0.5, fontSize: 32, bold: true, color: "F87171" });
slide.addText("annual spend on disconnected software tools", { x: 5.4, y: 3.5, w: 4, h: 0.4, fontSize: 11, color: colors.gray });

// Quote
slide.addShape(pptx.ShapeType.roundRect, {
  x: 0.5,
  y: 4.6,
  w: 9,
  h: 0.9,
  fill: { color: colors.light },
});
slide.addShape(pptx.ShapeType.rect, {
  x: 0.5,
  y: 4.6,
  w: 0.08,
  h: 0.9,
  fill: { color: colors.primary },
});
slide.addText('"I spend more time in spreadsheets than with my athletes"', {
  x: 0.7,
  y: 4.7,
  w: 8.5,
  h: 0.4,
  fontSize: 16,
  italic: true,
  color: colors.dark,
});
slide.addText("— Olympic Cycling Coach", {
  x: 0.7,
  y: 5.1,
  w: 8.5,
  h: 0.3,
  fontSize: 11,
  color: colors.gray,
});

// ============================================
// SLIDE 3: The Solution
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "The ", options: { color: colors.dark } },
  { text: "Solution", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

slide.addText("One unified platform for the complete athlete performance journey", {
  x: 0.5,
  y: 0.9,
  w: 9,
  h: 0.4,
  fontSize: 16,
  color: colors.gray,
});

const solutions = [
  { icon: "🔬", title: "Lab Testing", items: ["VO2max analysis", "Lactate profiling", "Threshold detection", "PDF reports"] },
  { icon: "📈", title: "Training Programs", items: ["17 sports supported", "Periodized plans", "Strength training", "Ergometer protocols"] },
  { icon: "📡", title: "Live Monitoring", items: ["Garmin sync", "Strava integration", "HRV tracking", "Readiness scores"] },
  { icon: "🤖", title: "AI Insights", items: ["Auto zone calculation", "Program generation", "Video analysis", "Injury prevention"] },
];

solutions.forEach((sol, i) => {
  const x = 0.5 + i * 2.4;
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y: 1.5,
    w: 2.2,
    h: 2.8,
    fill: { color: colors.light },
  });
  slide.addText(sol.icon, { x, y: 1.6, w: 2.2, h: 0.5, fontSize: 32, align: "center" });
  slide.addText(sol.title, { x, y: 2.1, w: 2.2, h: 0.35, fontSize: 14, bold: true, align: "center", color: colors.dark });
  sol.items.forEach((item, j) => {
    slide.addText("✓ " + item, { x: x + 0.15, y: 2.5 + j * 0.4, w: 2, h: 0.35, fontSize: 10, color: colors.gray });
  });
});

// Bottom banner
slide.addShape(pptx.ShapeType.roundRect, {
  x: 1.5,
  y: 4.6,
  w: 7,
  h: 0.6,
  fill: { color: colors.primary },
});
slide.addText("Lab-Quality Insights → Personalized Training → Measurable Outcomes", {
  x: 1.5,
  y: 4.65,
  w: 7,
  h: 0.5,
  fontSize: 14,
  bold: true,
  color: colors.white,
  align: "center",
});

// ============================================
// SLIDE 4: Product
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "The ", options: { color: colors.dark } },
  { text: "Product", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

const productFeatures = [
  { title: "Coach Dashboard", desc: "Complete athlete overview with performance metrics, training load, and readiness indicators", color: "E0F2FE" },
  { title: "Lab Reports", desc: "Professional PDF reports with VO2max curves, lactate thresholds, and personalized training zones", color: "DCFCE7" },
  { title: "AI Program Builder", desc: "Generate periodized training programs based on athlete physiology and goals", color: "F3E8FF" },
];

productFeatures.forEach((feat, i) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 1.2 + i * 1.1,
    w: 4.5,
    h: 1,
    fill: { color: feat.color },
  });
  slide.addText(feat.title, { x: 0.7, y: 1.3 + i * 1.1, w: 4, h: 0.35, fontSize: 14, bold: true, color: colors.dark });
  slide.addText(feat.desc, { x: 0.7, y: 1.65 + i * 1.1, w: 4, h: 0.5, fontSize: 10, color: colors.gray });
});

// Mobile box
slide.addShape(pptx.ShapeType.roundRect, {
  x: 5.2,
  y: 1.2,
  w: 4.3,
  h: 3.2,
  fill: { color: colors.dark },
});
slide.addText("📱", { x: 5.2, y: 1.5, w: 4.3, h: 1, fontSize: 72, align: "center" });
slide.addText("Athlete Mobile Portal", { x: 5.2, y: 2.8, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: colors.white, align: "center" });
slide.addText("Athletes view workouts, log sessions, and track progress from any device", {
  x: 5.4,
  y: 3.3,
  w: 4,
  h: 0.6,
  fontSize: 11,
  color: colors.gray,
  align: "center",
});

// Integrations
slide.addText("Integrations", { x: 0.5, y: 4.6, w: 2, h: 0.3, fontSize: 12, color: colors.gray });
const integrations = ["Garmin", "Strava", "Concept2", "VBT Devices"];
integrations.forEach((int, i) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.5 + i * 1.6,
    y: 4.55,
    w: 1.4,
    h: 0.4,
    fill: { color: colors.light },
  });
  slide.addText(int, { x: 2.5 + i * 1.6, y: 4.55, w: 1.4, h: 0.4, fontSize: 10, bold: true, align: "center", color: colors.dark });
});

// ============================================
// SLIDE 5: Market Opportunity
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "Market ", options: { color: colors.dark } },
  { text: "Opportunity", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

// TAM circles
slide.addShape(pptx.ShapeType.ellipse, { x: 0.7, y: 1.3, w: 2.2, h: 2.2, fill: { color: colors.primary } });
slide.addText("$12B", { x: 0.7, y: 2, w: 2.2, h: 0.4, fontSize: 24, bold: true, color: colors.white, align: "center" });
slide.addText("TAM", { x: 0.7, y: 2.4, w: 2.2, h: 0.3, fontSize: 12, color: colors.white, align: "center" });

slide.addShape(pptx.ShapeType.ellipse, { x: 2.1, y: 1.8, w: 1.7, h: 1.7, fill: { color: colors.secondary } });
slide.addText("$2.4B", { x: 2.1, y: 2.3, w: 1.7, h: 0.35, fontSize: 20, bold: true, color: colors.white, align: "center" });
slide.addText("SAM", { x: 2.1, y: 2.65, w: 1.7, h: 0.3, fontSize: 11, color: colors.white, align: "center" });

slide.addShape(pptx.ShapeType.ellipse, { x: 3.2, y: 2.2, w: 1.2, h: 1.2, fill: { color: colors.accent } });
slide.addText("$240M", { x: 3.2, y: 2.55, w: 1.2, h: 0.3, fontSize: 14, bold: true, color: colors.white, align: "center" });
slide.addText("SOM", { x: 3.2, y: 2.85, w: 1.2, h: 0.25, fontSize: 10, color: colors.white, align: "center" });

// Legend
const marketLegend = [
  { color: colors.primary, label: "TAM: Global sports technology market" },
  { color: colors.secondary, label: "SAM: Performance tracking & coaching software" },
  { color: colors.accent, label: "SOM: Premium coach/federation segment" },
];
marketLegend.forEach((item, i) => {
  slide.addShape(pptx.ShapeType.ellipse, { x: 0.7, y: 3.7 + i * 0.35, w: 0.2, h: 0.2, fill: { color: item.color } });
  slide.addText(item.label, { x: 1, y: 3.65 + i * 0.35, w: 4, h: 0.3, fontSize: 10, color: colors.dark });
});

// Market drivers
slide.addText("Market Drivers", { x: 5.2, y: 1.1, w: 4, h: 0.4, fontSize: 18, bold: true, color: colors.dark });

const drivers = [
  { label: "Sports tech CAGR", value: "↑ 18%" },
  { label: "Data-driven training adoption", value: "↑ High" },
  { label: "Wearable device proliferation", value: "↑ 25%" },
];
drivers.forEach((d, i) => {
  slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y: 1.5 + i * 0.55, w: 4.3, h: 0.45, fill: { color: colors.light } });
  slide.addText(d.label, { x: 5.4, y: 1.55 + i * 0.55, w: 2.5, h: 0.35, fontSize: 11, color: colors.dark });
  slide.addText(d.value, { x: 8, y: 1.55 + i * 0.55, w: 1.3, h: 0.35, fontSize: 11, bold: true, color: colors.accent, align: "right" });
});

// Target segments table
slide.addText("Target Segments", { x: 5.2, y: 3.3, w: 4, h: 0.4, fontSize: 14, bold: true, color: colors.dark });
const segments = [
  { label: "Professional coaches", value: "500K+" },
  { label: "Sports clubs & academies", value: "50K+" },
  { label: "National federations", value: "200+" },
  { label: "University programs", value: "5K+" },
];
segments.forEach((s, i) => {
  slide.addText(s.label, { x: 5.4, y: 3.7 + i * 0.35, w: 2.8, h: 0.3, fontSize: 10, color: colors.dark });
  slide.addText(s.value, { x: 8.2, y: 3.7 + i * 0.35, w: 1, h: 0.3, fontSize: 10, bold: true, color: colors.dark, align: "right" });
});

// ============================================
// SLIDE 6: Business Model
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "Business ", options: { color: colors.dark } },
  { text: "Model", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

slide.addText("SaaS Subscription + Usage-Based AI", {
  x: 0.5,
  y: 0.9,
  w: 9,
  h: 0.3,
  fontSize: 14,
  color: colors.gray,
});

// Pricing cards
const pricing = [
  { tier: "Free", price: "$0", period: "/month", desc: "3 athletes\nBasic features", featured: false },
  { tier: "Coach", price: "$49", period: "/month", desc: "15 athletes\nReports & zones", featured: false },
  { tier: "Pro", price: "$149", period: "/month", desc: "50 athletes\nAll integrations", featured: true },
  { tier: "Team", price: "$499", period: "/month", desc: "200 athletes\nAI & video", featured: false },
  { tier: "Enterprise", price: "Custom", period: "pricing", desc: "Unlimited\nWhite-label", featured: false },
];

pricing.forEach((p, i) => {
  const x = 0.5 + i * 1.9;
  const fillColor = p.featured ? colors.primary : colors.light;
  const textColor = p.featured ? colors.white : colors.dark;
  const subColor = p.featured ? "FFFFFF" : colors.gray;

  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y: 1.4,
    w: 1.7,
    h: 1.8,
    fill: { color: fillColor },
    shadow: p.featured ? { type: "outer", blur: 8, offset: 2, angle: 45, opacity: 0.3 } : undefined,
  });
  slide.addText(p.tier, { x, y: 1.5, w: 1.7, h: 0.3, fontSize: 12, bold: true, color: textColor, align: "center" });
  slide.addText(p.price, { x, y: 1.8, w: 1.7, h: 0.4, fontSize: 24, bold: true, color: textColor, align: "center" });
  slide.addText(p.period, { x, y: 2.2, w: 1.7, h: 0.25, fontSize: 10, color: subColor, align: "center" });
  slide.addText(p.desc, { x, y: 2.5, w: 1.7, h: 0.6, fontSize: 9, color: subColor, align: "center" });
});

// Unit economics
slide.addText("Unit Economics Target", { x: 0.5, y: 3.5, w: 9, h: 0.4, fontSize: 18, bold: true, color: colors.dark });

const unitEcon = [
  { value: "$2,400", label: "LTV (24mo avg)" },
  { value: "$400", label: "CAC" },
  { value: "6:1", label: "LTV:CAC Ratio" },
  { value: "80%+", label: "Gross Margin" },
];

unitEcon.forEach((u, i) => {
  const x = 0.5 + i * 2.4;
  slide.addShape(pptx.ShapeType.roundRect, { x, y: 3.9, w: 2.2, h: 1.1, fill: { color: colors.light } });
  slide.addText(u.value, { x, y: 4, w: 2.2, h: 0.5, fontSize: 24, bold: true, color: i >= 2 ? colors.accent : colors.primary, align: "center" });
  slide.addText(u.label, { x, y: 4.5, w: 2.2, h: 0.3, fontSize: 10, color: colors.gray, align: "center" });
});

// ============================================
// SLIDE 7: Traction
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "Traction & ", options: { color: colors.dark } },
  { text: "Milestones", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

// Key metrics
slide.addText("Key Metrics", { x: 0.5, y: 1, w: 4, h: 0.4, fontSize: 16, bold: true, color: colors.dark });

const metrics = [
  { value: "$12K", label: "MRR", change: "+25% MoM" },
  { value: "180", label: "Active Coaches", change: "+30% MoM" },
  { value: "2,400", label: "Athletes", change: "" },
  { value: "8,500", label: "Tests Processed", change: "" },
];

metrics.forEach((m, i) => {
  const x = 0.5 + (i % 2) * 2.3;
  const y = 1.4 + Math.floor(i / 2) * 1.1;
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.1, h: 1, fill: { color: colors.light } });
  slide.addText(m.value, { x, y: y + 0.1, w: 2.1, h: 0.4, fontSize: 28, bold: true, color: colors.primary, align: "center" });
  slide.addText(m.label, { x, y: y + 0.5, w: 2.1, h: 0.25, fontSize: 10, color: colors.gray, align: "center" });
  if (m.change) {
    slide.addText(m.change, { x, y: y + 0.75, w: 2.1, h: 0.2, fontSize: 9, color: colors.accent, align: "center" });
  }
});

// Pipeline box
slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 3.6, w: 4.5, h: 0.6, fill: { color: "FDE68A" } });
slide.addText("Enterprise Pipeline", { x: 0.7, y: 3.7, w: 2, h: 0.4, fontSize: 12, bold: true, color: colors.dark });
slide.addText("$180K ACV", { x: 3, y: 3.65, w: 1.8, h: 0.5, fontSize: 20, bold: true, color: "D97706", align: "right" });

// Milestones
slide.addText("Milestones", { x: 5.2, y: 1, w: 4, h: 0.4, fontSize: 16, bold: true, color: colors.dark });

const milestones = [
  { done: true, text: "Product-market fit validated" },
  { done: true, text: "4 paying federation pilots" },
  { done: true, text: "Garmin & Strava integrations live" },
  { done: true, text: "AI program generator launched" },
  { done: false, text: "Enterprise pipeline: $180K ACV" },
];

milestones.forEach((m, i) => {
  const y = 1.4 + i * 0.5;
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 5.2,
    y,
    w: 0.35,
    h: 0.35,
    fill: { color: m.done ? colors.accent : colors.secondary },
  });
  slide.addText(m.done ? "✓" : "→", { x: 5.2, y: y - 0.02, w: 0.35, h: 0.35, fontSize: 12, color: colors.white, align: "center" });
  slide.addText(m.text, { x: 5.7, y, w: 3.7, h: 0.35, fontSize: 12, color: colors.dark });
});

// Customer logos box
slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y: 4, w: 4.3, h: 1, fill: { color: colors.dark } });
slide.addText("Customer Logos", { x: 5.4, y: 4.1, w: 4, h: 0.3, fontSize: 12, bold: true, color: colors.white });
const logos = ["Norwegian Ski Fed", "Elite Cycling Academy", "Olympic Training Center"];
logos.forEach((logo, i) => {
  slide.addShape(pptx.ShapeType.roundRect, { x: 5.4 + i * 1.35, y: 4.5, w: 1.25, h: 0.4, fill: { color: "1E293B" } });
  slide.addText(logo, { x: 5.4 + i * 1.35, y: 4.5, w: 1.25, h: 0.4, fontSize: 7, color: colors.white, align: "center" });
});

// ============================================
// SLIDE 8: Competition
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "Competitive ", options: { color: colors.dark } },
  { text: "Landscape", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

// Matrix axes
slide.addShape(pptx.ShapeType.line, { x: 0.5, y: 1.2, w: 0, h: 3.2, line: { color: colors.dark, width: 1.5 } });
slide.addShape(pptx.ShapeType.line, { x: 0.5, y: 4.4, w: 4.5, h: 0, line: { color: colors.dark, width: 1.5 } });
slide.addText("Enterprise Features ↑", { x: 0.6, y: 1.1, w: 2, h: 0.25, fontSize: 9, color: colors.gray });
slide.addText("Single Sport ←→ Multi-Sport", { x: 1.5, y: 4.5, w: 3, h: 0.25, fontSize: 9, color: colors.gray, align: "center" });

// Competitors
const competitors = [
  { name: "TrainingPeaks", x: 1.2, y: 1.8, us: false },
  { name: "Star Performance", x: 4, y: 1.5, us: true },
  { name: "Strava", x: 1.5, y: 3.5, us: false },
  { name: "TrainHeroic", x: 3.5, y: 3.2, us: false },
];

competitors.forEach((c) => {
  const size = c.us ? 0.3 : 0.2;
  slide.addShape(pptx.ShapeType.ellipse, {
    x: c.x,
    y: c.y,
    w: size,
    h: size,
    fill: { color: c.us ? colors.primary : colors.gray },
  });
  slide.addText(c.name, {
    x: c.x - 0.5,
    y: c.y + (c.us ? 0.35 : 0.25),
    w: 1.5,
    h: 0.25,
    fontSize: c.us ? 10 : 9,
    bold: c.us,
    color: c.us ? colors.primary : colors.gray,
    align: "center",
  });
});

// Advantages table
slide.addText("Our Advantages", { x: 5.2, y: 1.1, w: 4, h: 0.4, fontSize: 16, bold: true, color: colors.dark });

// Table header
slide.addShape(pptx.ShapeType.rect, { x: 5.2, y: 1.5, w: 2.15, h: 0.4, fill: { color: colors.dark } });
slide.addShape(pptx.ShapeType.rect, { x: 7.35, y: 1.5, w: 2.15, h: 0.4, fill: { color: colors.dark } });
slide.addText("Us", { x: 5.2, y: 1.5, w: 2.15, h: 0.4, fontSize: 11, bold: true, color: colors.white, align: "center" });
slide.addText("Competitors", { x: 7.35, y: 1.5, w: 2.15, h: 0.4, fontSize: 11, bold: true, color: colors.white, align: "center" });

const advantages = [
  { us: "✓ Lab + training unified", them: "✗ Separate tools" },
  { us: "✓ 17 sports supported", them: "✗ 1-3 sports only" },
  { us: "✓ AI-powered programs", them: "✗ Manual templates" },
  { us: "✓ Real physiological zones", them: "✗ Generic HR zones" },
  { us: "✓ Video analysis included", them: "✗ $500+/mo add-on" },
];

advantages.forEach((a, i) => {
  const y = 1.95 + i * 0.4;
  slide.addShape(pptx.ShapeType.rect, { x: 5.2, y, w: 2.15, h: 0.4, fill: { color: i % 2 === 0 ? colors.white : colors.light } });
  slide.addShape(pptx.ShapeType.rect, { x: 7.35, y, w: 2.15, h: 0.4, fill: { color: i % 2 === 0 ? colors.white : colors.light } });
  slide.addText(a.us, { x: 5.3, y, w: 2, h: 0.4, fontSize: 9, color: colors.accent });
  slide.addText(a.them, { x: 7.45, y, w: 2, h: 0.4, fontSize: 9, color: colors.red });
});

// Moat box
slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y: 4.1, w: 4.3, h: 0.9, fill: { color: colors.primary } });
slide.addText("Defensible Moat", { x: 5.4, y: 4.2, w: 4, h: 0.3, fontSize: 12, bold: true, color: colors.white });
slide.addText("Proprietary algorithms for threshold detection, training load optimization, and AI-driven periodization", {
  x: 5.4,
  y: 4.5,
  w: 4,
  h: 0.45,
  fontSize: 9,
  color: colors.white,
});

// ============================================
// SLIDE 9: Go-to-Market
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "Go-to-Market ", options: { color: colors.dark } },
  { text: "Strategy", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

// Timeline
const phases = [
  { num: "1", title: "Niche", desc: "Nordic sports\nDirect sales" },
  { num: "2", title: "Expand", desc: "Cycling, tri, rowing\nPartner channels" },
  { num: "3", title: "Scale", desc: "Team sports\nUniversity programs" },
  { num: "4", title: "Platform", desc: "White-label\nAPI ecosystem" },
];

// Timeline line
slide.addShape(pptx.ShapeType.line, { x: 1.5, y: 1.35, w: 7, h: 0, line: { color: "E2E8F0", width: 3 } });

phases.forEach((p, i) => {
  const x = 1.2 + i * 2.2;
  slide.addShape(pptx.ShapeType.ellipse, {
    x,
    y: 1.1,
    w: 0.5,
    h: 0.5,
    fill: { color: i === 0 ? colors.accent : colors.primary },
  });
  slide.addText(p.num, { x, y: 1.15, w: 0.5, h: 0.4, fontSize: 16, bold: true, color: colors.white, align: "center" });
  slide.addText("Phase " + p.num + ": " + p.title, { x: x - 0.5, y: 1.7, w: 1.5, h: 0.3, fontSize: 11, bold: true, color: colors.dark, align: "center" });
  slide.addText(p.desc, { x: x - 0.5, y: 2, w: 1.5, h: 0.6, fontSize: 9, color: colors.gray, align: "center" });
});

// Distribution channels table
slide.addText("Distribution Channels", { x: 0.5, y: 2.9, w: 4, h: 0.4, fontSize: 14, bold: true, color: colors.dark });

slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.3, w: 2, h: 0.35, fill: { color: colors.dark } });
slide.addShape(pptx.ShapeType.rect, { x: 2.5, y: 3.3, w: 1.2, h: 0.35, fill: { color: colors.dark } });
slide.addShape(pptx.ShapeType.rect, { x: 3.7, y: 3.3, w: 0.8, h: 0.35, fill: { color: colors.dark } });
slide.addText("Channel", { x: 0.5, y: 3.3, w: 2, h: 0.35, fontSize: 10, bold: true, color: colors.white, align: "center" });
slide.addText("% Revenue", { x: 2.5, y: 3.3, w: 1.2, h: 0.35, fontSize: 10, bold: true, color: colors.white, align: "center" });
slide.addText("CAC", { x: 3.7, y: 3.3, w: 0.8, h: 0.35, fontSize: 10, bold: true, color: colors.white, align: "center" });

const channels = [
  { name: "Organic / Content", pct: "40%", cac: "$150" },
  { name: "Direct Sales", pct: "35%", cac: "$600" },
  { name: "Partnerships", pct: "20%", cac: "$300" },
  { name: "Paid Ads", pct: "5%", cac: "$450" },
];

channels.forEach((c, i) => {
  const y = 3.65 + i * 0.35;
  const bg = i % 2 === 0 ? colors.white : colors.light;
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 2, h: 0.35, fill: { color: bg } });
  slide.addShape(pptx.ShapeType.rect, { x: 2.5, y, w: 1.2, h: 0.35, fill: { color: bg } });
  slide.addShape(pptx.ShapeType.rect, { x: 3.7, y, w: 0.8, h: 0.35, fill: { color: bg } });
  slide.addText(c.name, { x: 0.6, y, w: 1.9, h: 0.35, fontSize: 10, color: colors.dark });
  slide.addText(c.pct, { x: 2.5, y, w: 1.2, h: 0.35, fontSize: 10, color: colors.dark, align: "center" });
  slide.addText(c.cac, { x: 3.7, y, w: 0.8, h: 0.35, fontSize: 10, color: i === 0 ? colors.accent : colors.dark, align: "center" });
});

// Key activities
slide.addText("Key Activities", { x: 5.2, y: 2.9, w: 4, h: 0.4, fontSize: 14, bold: true, color: colors.dark });

const activities = [
  { title: "Content Marketing", desc: "Training science blog, YouTube, podcasts" },
  { title: "Conference Presence", desc: "NSCA, ACSM, sports science events" },
  { title: "Strategic Partnerships", desc: "Equipment manufacturers, sports retailers" },
];

activities.forEach((a, i) => {
  const y = 3.3 + i * 0.7;
  slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y, w: 4.3, h: 0.6, fill: { color: colors.light } });
  slide.addText(a.title, { x: 5.4, y: y + 0.05, w: 4, h: 0.25, fontSize: 11, bold: true, color: colors.dark });
  slide.addText(a.desc, { x: 5.4, y: y + 0.3, w: 4, h: 0.25, fontSize: 9, color: colors.gray });
});

// ============================================
// SLIDE 10: Team
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "The ", options: { color: colors.dark } },
  { text: "Team", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

const team = [
  { role: "CEO", name: "[Founder Name]", bio: "10 years in sports science.\nFormer national team coach.\nMSc Exercise Physiology." },
  { role: "CTO", name: "[Founder Name]", bio: "Ex-[Tech Company].\nBuilt scalable platforms\nserving 1M+ users." },
  { role: "CPO", name: "[Founder Name]", bio: "Former elite athlete.\nProduct at [Company].\nDeep domain expertise." },
];

team.forEach((t, i) => {
  const x = 0.7 + i * 3.1;
  // Avatar circle
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x + 0.55,
    y: 1.1,
    w: 1.3,
    h: 1.3,
    fill: { color: colors.primary },
  });
  slide.addText("👤", { x: x + 0.55, y: 1.35, w: 1.3, h: 0.8, fontSize: 40, align: "center" });
  slide.addText(t.role, { x, y: 2.5, w: 2.4, h: 0.3, fontSize: 12, color: colors.primary, bold: true, align: "center" });
  slide.addText(t.name, { x, y: 2.8, w: 2.4, h: 0.35, fontSize: 16, bold: true, color: colors.dark, align: "center" });
  slide.addText(t.bio, { x, y: 3.2, w: 2.4, h: 0.8, fontSize: 10, color: colors.gray, align: "center" });
});

// Advisors
slide.addText("Advisors", { x: 0.5, y: 4.1, w: 9, h: 0.3, fontSize: 14, bold: true, color: colors.dark });

const advisors = [
  { name: "[Advisor Name]", title: "3x Olympic medalist coach" },
  { name: "[Advisor Name]", title: "PhD, VO2max researcher" },
  { name: "[Advisor Name]", title: "Former VP Sales, [SaaS Co]" },
];

advisors.forEach((a, i) => {
  const x = 0.5 + i * 3.1;
  slide.addShape(pptx.ShapeType.roundRect, { x, y: 4.4, w: 2.9, h: 0.6, fill: { color: colors.light } });
  slide.addText(a.name, { x: x + 0.1, y: 4.45, w: 2.7, h: 0.25, fontSize: 11, bold: true, color: colors.dark });
  slide.addText(a.title, { x: x + 0.1, y: 4.7, w: 2.7, h: 0.25, fontSize: 9, color: colors.gray });
});

// ============================================
// SLIDE 11: Financials
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "Financial ", options: { color: colors.dark } },
  { text: "Projections", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

// 5-Year table
slide.addText("5-Year Revenue Forecast", { x: 0.5, y: 1, w: 4, h: 0.4, fontSize: 14, bold: true, color: colors.dark });

// Table header
const finHeaders = ["Year", "ARR", "Users", "Growth"];
finHeaders.forEach((h, i) => {
  slide.addShape(pptx.ShapeType.rect, { x: 0.5 + i * 1.1, y: 1.4, w: 1.1, h: 0.35, fill: { color: colors.dark } });
  slide.addText(h, { x: 0.5 + i * 1.1, y: 1.4, w: 1.1, h: 0.35, fontSize: 10, bold: true, color: colors.white, align: "center" });
});

const financials = [
  { year: "2024", arr: "$150K", users: "400", growth: "-" },
  { year: "2025", arr: "$600K", users: "1,200", growth: "+300%" },
  { year: "2026", arr: "$2M", users: "3,500", growth: "+233%" },
  { year: "2027", arr: "$5M", users: "8,000", growth: "+150%" },
  { year: "2028", arr: "$10M", users: "15,000", growth: "+100%" },
];

financials.forEach((f, i) => {
  const y = 1.75 + i * 0.35;
  const bg = i === 4 ? colors.light : (i % 2 === 0 ? colors.white : "FAFAFA");
  const bold = i === 4;
  [f.year, f.arr, f.users, f.growth].forEach((val, j) => {
    slide.addShape(pptx.ShapeType.rect, { x: 0.5 + j * 1.1, y, w: 1.1, h: 0.35, fill: { color: bg } });
    const textColor = j === 3 && f.growth !== "-" ? colors.accent : colors.dark;
    slide.addText(val, { x: 0.5 + j * 1.1, y, w: 1.1, h: 0.35, fontSize: 10, bold, color: textColor, align: "center" });
  });
});

// Path to profitability
slide.addText("Path to Profitability", { x: 5.2, y: 1, w: 4, h: 0.4, fontSize: 14, bold: true, color: colors.dark });

const pathItems = [
  { label: "Break-even ARR", value: "~$4M" },
  { label: "Gross Margins", value: "75%+" },
  { label: "Capital Efficiency", value: "$1 → $4 ARR" },
];

pathItems.forEach((p, i) => {
  const y = 1.4 + i * 0.5;
  slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y, w: 4.3, h: 0.4, fill: { color: colors.light } });
  slide.addText(p.label, { x: 5.4, y, w: 2.5, h: 0.4, fontSize: 11, color: colors.dark });
  slide.addText(p.value, { x: 7.8, y, w: 1.5, h: 0.4, fontSize: 11, bold: true, color: i > 0 ? colors.accent : colors.dark, align: "right" });
});

// 2028 projection box
slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y: 3.1, w: 4.3, h: 1.4, fill: { color: colors.primary } });
slide.addText("Projected 2028", { x: 5.2, y: 3.2, w: 4.3, h: 0.3, fontSize: 12, bold: true, color: colors.white, align: "center" });

const projections = [
  { value: "$10M", label: "ARR" },
  { value: "75%", label: "Margin" },
  { value: "Profitable", label: "Status" },
];

projections.forEach((p, i) => {
  const x = 5.4 + i * 1.4;
  slide.addText(p.value, { x, y: 3.6, w: 1.2, h: 0.4, fontSize: 22, bold: true, color: colors.white, align: "center" });
  slide.addText(p.label, { x, y: 4, w: 1.2, h: 0.25, fontSize: 9, color: colors.white, align: "center" });
});

// ============================================
// SLIDE 12: The Ask
// ============================================
slide = pptx.addSlide();

slide.addText([
  { text: "The ", options: { color: colors.dark } },
  { text: "Ask", options: { color: colors.primary } },
], {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
});

// Big ask box
slide.addShape(pptx.ShapeType.roundRect, {
  x: 1.5,
  y: 1.1,
  w: 7,
  h: 1.4,
  fill: { color: colors.primary },
  shadow: { type: "outer", blur: 12, offset: 4, angle: 45, opacity: 0.3 },
});
slide.addText("$2.5M", { x: 1.5, y: 1.2, w: 7, h: 0.8, fontSize: 54, bold: true, color: colors.white, align: "center" });
slide.addText("Seed Round", { x: 1.5, y: 1.95, w: 7, h: 0.4, fontSize: 20, color: colors.white, align: "center" });

// Use of funds
slide.addText("Use of Funds", { x: 0.5, y: 2.7, w: 9, h: 0.4, fontSize: 14, bold: true, color: colors.dark });

const funds = [
  { pct: "45%", label: "Engineering", amount: "$1.1M", desc: "Team expansion, AI features" },
  { pct: "30%", label: "Sales & Marketing", amount: "$750K", desc: "Go-to-market, content" },
  { pct: "15%", label: "Operations", amount: "$375K", desc: "Customer success, support" },
  { pct: "10%", label: "G&A", amount: "$250K", desc: "Legal, admin, buffer" },
];

funds.forEach((f, i) => {
  const x = 0.5 + i * 2.4;
  slide.addText(f.pct, { x, y: 3.1, w: 2.2, h: 0.5, fontSize: 32, bold: true, color: colors.primary, align: "center" });
  slide.addText(f.label, { x, y: 3.6, w: 2.2, h: 0.3, fontSize: 11, bold: true, color: colors.dark, align: "center" });
  slide.addText(f.amount, { x, y: 3.9, w: 2.2, h: 0.25, fontSize: 10, color: colors.gray, align: "center" });
  slide.addText(f.desc, { x, y: 4.15, w: 2.2, h: 0.35, fontSize: 9, color: colors.gray, align: "center" });
});

// Milestones box
slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 4.6, w: 9, h: 0.9, fill: { color: colors.light } });
slide.addText("Milestones This Round Unlocks", { x: 0.7, y: 4.65, w: 8.5, h: 0.3, fontSize: 12, bold: true, color: colors.dark });

const roundMilestones = [
  { value: "$1.5M", label: "ARR Target" },
  { value: "3,000+", label: "Paying Users" },
  { value: "10+", label: "Federation Contracts" },
  { value: "Series A", label: "Ready" },
];

roundMilestones.forEach((m, i) => {
  const x = 1 + i * 2.2;
  slide.addText(m.value, { x, y: 4.95, w: 1.8, h: 0.3, fontSize: 18, bold: true, color: i === 3 ? colors.accent : colors.primary, align: "center" });
  slide.addText(m.label, { x, y: 5.25, w: 1.8, h: 0.2, fontSize: 9, color: colors.gray, align: "center" });
});

// ============================================
// SLIDE 13: Vision
// ============================================
slide = pptx.addSlide();
slide.background = { color: colors.dark };

slide.addText([
  { text: "Our ", options: { color: colors.white } },
  { text: "Vision", options: { color: colors.secondary } },
], {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  fontSize: 32,
  bold: true,
});

slide.addText('"Every athlete deserves world-class sports science"', {
  x: 0.5,
  y: 1.4,
  w: 9,
  h: 0.6,
  fontSize: 32,
  color: colors.secondary,
  align: "center",
});

// Vision timeline
const visionYears = [
  { year: "2024", goal: "Best-in-class testing\n& programming platform" },
  { year: "2026", goal: "The Salesforce of\nsports performance" },
  { year: "2028", goal: "Global standard for\nelite athletic development" },
];

visionYears.forEach((v, i) => {
  const x = 1.2 + i * 2.8;
  slide.addText(v.year, { x, y: 2.4, w: 2.4, h: 0.4, fontSize: 20, bold: true, color: colors.primary, align: "center" });
  slide.addText(v.goal, { x, y: 2.85, w: 2.4, h: 0.7, fontSize: 12, color: colors.gray, align: "center" });
});

// Exit comparables
slide.addText("Exit Comparables", { x: 0.5, y: 3.8, w: 9, h: 0.3, fontSize: 12, color: colors.gray, align: "center" });

const exits = [
  { company: "Firstbeat → Garmin", value: "$70M" },
  { company: "Today's Plan → Zwift", value: "$30M+" },
  { company: "WHOOP", value: "$3.6B" },
];

exits.forEach((e, i) => {
  const x = 1.5 + i * 2.6;
  slide.addText(e.company, { x, y: 4.2, w: 2.2, h: 0.3, fontSize: 14, bold: true, color: colors.white, align: "center" });
  slide.addText(e.value, { x, y: 4.55, w: 2.2, h: 0.4, fontSize: 20, bold: true, color: colors.accent, align: "center" });
});

// ============================================
// SLIDE 14: Thank You
// ============================================
slide = pptx.addSlide();
slide.background = { color: colors.dark };

slide.addText("Thank You", {
  x: 0.5,
  y: 1.8,
  w: 9,
  h: 0.8,
  fontSize: 54,
  bold: true,
  color: colors.primary,
  align: "center",
});

slide.addText("Let's build the future of athletic performance together", {
  x: 0.5,
  y: 2.6,
  w: 9,
  h: 0.4,
  fontSize: 18,
  color: colors.gray,
  align: "center",
});

slide.addText("Contact", {
  x: 0.5,
  y: 3.4,
  w: 9,
  h: 0.3,
  fontSize: 12,
  color: colors.gray,
  align: "center",
});

slide.addText("[founder@starperformance.com]", {
  x: 0.5,
  y: 3.8,
  w: 9,
  h: 0.4,
  fontSize: 20,
  color: colors.secondary,
  align: "center",
});

slide.addText("[www.starperformancelab.com]", {
  x: 0.5,
  y: 4.3,
  w: 9,
  h: 0.3,
  fontSize: 14,
  color: colors.gray,
  align: "center",
});

// Save the presentation
pptx.writeFile({ fileName: "Star-Performance-Lab-Pitch-Deck.pptx" })
  .then((fileName) => {
    console.log(`✅ PowerPoint created successfully: ${fileName}`);
  })
  .catch((err) => {
    console.error("Error creating PowerPoint:", err);
  });
