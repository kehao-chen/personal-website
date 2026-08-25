import { test, expect } from '@playwright/test';
import { loadedThreeJs } from './support/detect-three';

/** 這條護欄防止未來的自己在文章頁加進 WebGL。 */
test('文章內頁不得載入 three.js', async ({ page }) => {
  const found = await loadedThreeJs(page, '/writing/approval-orchestrator/');
  expect(found, '不應載入含 three.js 的 chunk').toBe(false);
});

test('中文文章內頁同樣不得載入 three.js', async ({ page }) => {
  const found = await loadedThreeJs(page, '/zh/writing/aks-lun-exhaustion/');
  expect(found, '不應載入含 three.js 的 chunk').toBe(false);
});

test('首頁確實載入 three.js', async ({ page }) => {
  const found = await loadedThreeJs(page, '/');
  expect(found, '首頁應該載入含 three.js 的 chunk').toBe(true);
});
