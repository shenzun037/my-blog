/**
 * WCAG 2.2 AA Contrast Validation Script for SHENZUN Theme Families
 * Computes exact relative luminance and verifies contrast ratios across all 13 families
 * in both Light and Dark appearance modes.
 */

import { THEME_FAMILIES } from '../src/constants/themes';
import { ColorFamilyId, AppearanceMode, ThemeTokens } from '../src/types/journal';

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function parseRgba(colorStr: string): { r: number; g: number; b: number; a: number } {
  if (colorStr.startsWith('#')) {
    const [r, g, b] = hexToRgb(colorStr);
    return { r, g, b, a: 1 };
  }
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    };
  }
  throw new Error(`Cannot parse color string: ${colorStr}`);
}

/** Composite foreground over background taking alpha into account */
function composite(fgStr: string, bgStr: string): [number, number, number] {
  const fg = parseRgba(fgStr);
  const bg = parseRgba(bgStr);

  const r = Math.round(fg.r * fg.a + bg.r * (1 - fg.a));
  const g = Math.round(fg.g * fg.a + bg.g * (1 - fg.a));
  const b = Math.round(fg.b * fg.a + bg.b * (1 - fg.a));

  return [r, g, b];
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(fgHexOrRgba: string, bgHexOrRgba: string): number {
  const compFg = composite(fgHexOrRgba, bgHexOrRgba);
  const compBg = composite(bgHexOrRgba, '#ffffff');

  const l1 = getRelativeLuminance(compFg);
  const l2 = getRelativeLuminance(compBg);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

interface TestCheck {
  name: string;
  fg: keyof ThemeTokens;
  bg: keyof ThemeTokens;
  minRatio: number;
  level: 'AA-normal' | 'AA-large' | 'UI-boundary';
}

const REQUIRED_CHECKS: TestCheck[] = [
  { name: 'Primary Text on Page Background', fg: 'textPrimary', bg: 'pageBg', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Primary Text on Surface', fg: 'textPrimary', bg: 'surface', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Primary Text on Raised Surface', fg: 'textPrimary', bg: 'surfaceRaised', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Secondary Text on Page Background', fg: 'textSecondary', bg: 'pageBg', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Secondary Text on Surface', fg: 'textSecondary', bg: 'surface', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Secondary Text on Raised Surface', fg: 'textSecondary', bg: 'surfaceRaised', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Muted Text on Page Background', fg: 'textMuted', bg: 'pageBg', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Muted Text on Surface', fg: 'textMuted', bg: 'surface', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Accent Button Text on Accent', fg: 'accentContrastText', bg: 'accent', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Accent Button Text on Accent Hover', fg: 'accentContrastText', bg: 'accentHover', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Input Text on Input Background', fg: 'inputText', bg: 'inputBg', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Placeholder on Input Background', fg: 'placeholder', bg: 'inputBg', minRatio: 3.0, level: 'AA-large' },
  { name: 'Inverse Text on Primary Text', fg: 'textInverse', bg: 'textPrimary', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Link Text on Surface', fg: 'link', bg: 'surface', minRatio: 4.5, level: 'AA-normal' },
  { name: 'Focus Ring on Surface', fg: 'focusRing', bg: 'surface', minRatio: 3.0, level: 'UI-boundary' },
];

export function runValidation() {
  console.log('========================================================================');
  console.log('🔍 WCAG 2.2 AA Contrast Validation for All 13 Theme Families (Light & Dark)');
  console.log('========================================================================\n');

  let totalTested = 0;
  let totalPassed = 0;
  const failures: string[] = [];

  const families = Object.keys(THEME_FAMILIES) as ColorFamilyId[];
  const modes: AppearanceMode[] = ['light', 'dark'];

  for (const familyId of families) {
    const family = THEME_FAMILIES[familyId];

    for (const mode of modes) {
      const tokens = family.variants[mode];
      console.log(`🎨 Family: [${family.name}] | Mode: [${mode.toUpperCase()}]`);

      for (const check of REQUIRED_CHECKS) {
        totalTested++;
        const fgColor = tokens[check.fg] as string;
        const bgColor = tokens[check.bg] as string;

        try {
          const ratio = getContrastRatio(fgColor, bgColor);
          const passed = ratio >= check.minRatio;

          if (passed) {
            totalPassed++;
            console.log(
              `  ✅ PASS [${ratio.toFixed(2)}:1 >= ${check.minRatio}:1] ${check.name} (${String(check.fg)} on ${String(check.bg)})`
            );
          } else {
            const failMsg = `  ❌ FAIL [${ratio.toFixed(2)}:1 < ${check.minRatio}:1] ${family.name} (${mode}) -> ${check.name} (${String(check.fg)}: ${fgColor} on ${String(check.bg)}: ${bgColor})`;
            console.error(failMsg);
            failures.push(failMsg);
          }
        } catch (err: any) {
          const errorMsg = `  ❌ ERROR evaluating ${check.name}: ${err.message}`;
          console.error(errorMsg);
          failures.push(errorMsg);
        }
      }
      console.log('');
    }
  }

  console.log('========================================================================');
  console.log(`📊 Summary: ${totalPassed} / ${totalTested} checks passed.`);
  if (failures.length > 0) {
    console.error(`💥 Contrast Validation FAILED with ${failures.length} issue(s):`);
    failures.forEach((f) => console.error(f));
    process.exit(1);
  } else {
    console.log('🎉 100% WCAG 2.2 AA Contrast Compliance across all 13 families and appearance variants!');
    console.log('========================================================================');
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('test-contrast')) {
  runValidation();
}
