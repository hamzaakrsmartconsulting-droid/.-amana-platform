// tests/e2e/funnel-patrimoniale.spec.ts
// Sprint Agents IA v20 · 30 avril 2026

import { test, expect } from '@playwright/test'

test.describe('Funnel public — tunnel Patrimoniale', () => {
  test('patrimoine 200 k€ aiguille vers Patrimoniale', async ({ page }) => {
    const testEmail = `e2e-patrimoniale-${Date.now()}@amana-test.fr`

    await page.goto('/onboard')

    // Étape 1
    await page.getByLabel(/Optimiser ma fiscalité/).check()
    await page.locator('input[type="number"]').first().fill('15')
    await page.getByRole('combobox').selectOption('elevee')
    await page.getByRole('button', { name: /Continuer/i }).click()

    // Étape 2 — patrimoine 200 k€
    await page.getByPlaceholder('Ex: 75000').fill('200000')
    await page.getByPlaceholder('Ex: 45000').fill('80000')
    // Pas d'indicateurs cochés
    await page.getByRole('button', { name: /Continuer/i }).click()

    // Étape 3
    await page.getByRole('button', { name: /Voir mon profil/i }).click()

    // Étape 4 — doit afficher Patrimoniale
    await expect(page.getByText(/Patrimoniale.*assisté|rdv visio/i)).toBeVisible({
      timeout: 10_000,
    })
    await page.getByLabel('Prénom *').fill('TestPatri')
    await page.getByLabel('Nom *').fill('AmanaE2E')
    await page.getByLabel('Email *').fill(testEmail)
    await page.getByRole('button', { name: /Créer mon espace/i }).click()

    await expect(page).toHaveURL(/\/onboard\/result\/patrimoniale/, {
      timeout: 15_000,
    })
    await expect(page.getByText(/Réservez votre rdv visio/i)).toBeVisible()
  })

  test('1 indicateur de complexité aiguille vers Patrimoniale même à 50 k€', async ({ page }) => {
    const testEmail = `e2e-patri-sci-${Date.now()}@amana-test.fr`

    await page.goto('/onboard')

    // Étape 1
    await page.getByLabel(/Investir en immobilier/).check()
    await page.getByRole('button', { name: /Continuer/i }).click()

    // Étape 2 — 50 k€ + cocher SCI
    await page.getByPlaceholder('Ex: 75000').fill('50000')
    await page.getByLabel(/Je détiens une SCI/).check()
    await page.getByRole('button', { name: /Continuer/i }).click()

    // Étape 3
    await page.getByRole('button', { name: /Voir mon profil/i }).click()

    // Doit afficher Patrimoniale (1 indicateur SCI)
    await expect(page.getByText(/Patrimoniale/i)).toBeVisible({ timeout: 10_000 })

    await page.getByLabel('Prénom *').fill('TestSCI')
    await page.getByLabel('Nom *').fill('AmanaE2E')
    await page.getByLabel('Email *').fill(testEmail)
    await page.getByRole('button', { name: /Créer mon espace/i }).click()

    await expect(page).toHaveURL(/\/onboard\/result\/patrimoniale/, {
      timeout: 15_000,
    })
  })
})
