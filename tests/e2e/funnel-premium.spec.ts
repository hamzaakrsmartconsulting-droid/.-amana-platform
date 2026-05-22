// tests/e2e/funnel-premium.spec.ts
// Sprint Agents IA v20 · 30 avril 2026

import { test, expect } from '@playwright/test'

test.describe('Funnel public — tunnel Premium', () => {
  test('patrimoine 600 k€ aiguille vers Premium', async ({ page }) => {
    const testEmail = `e2e-premium-${Date.now()}@amana-test.fr`

    await page.goto('/onboard')

    await page.getByLabel(/Transmettre à mes proches/).check()
    await page.locator('input[type="number"]').first().fill('25')
    await page.getByRole('button', { name: /Continuer/i }).click()

    await page.getByPlaceholder('Ex: 75000').fill('600000')
    await page.getByRole('button', { name: /Continuer/i }).click()

    await page.getByRole('button', { name: /Voir mon profil/i }).click()

    await expect(page.getByText(/Premium.*sur-mesure/i)).toBeVisible({
      timeout: 10_000,
    })
    await page.getByLabel('Prénom *').fill('TestPremium')
    await page.getByLabel('Nom *').fill('AmanaE2E')
    await page.getByLabel('Email *').fill(testEmail)
    await page.getByRole('button', { name: /Créer mon espace/i }).click()

    await expect(page).toHaveURL(/\/onboard\/result\/premium/, {
      timeout: 15_000,
    })
    await expect(page.getByText(/sur-mesure/i)).toBeVisible()
    await expect(page.getByText(/Réserver un rdv découverte/i)).toBeVisible()
  })

  test('succession active aiguille vers Premium même à 30 k€', async ({ page }) => {
    const testEmail = `e2e-premium-succession-${Date.now()}@amana-test.fr`

    await page.goto('/onboard')

    await page.getByLabel(/Gérer un héritage reçu/).check()
    await page.getByRole('button', { name: /Continuer/i }).click()

    await page.getByPlaceholder('Ex: 75000').fill('30000')
    await page.getByLabel(/succession est en cours dans ma famille/i).check()
    await page.getByRole('button', { name: /Continuer/i }).click()

    await page.getByRole('button', { name: /Voir mon profil/i }).click()

    await expect(page.getByText(/Premium/i)).toBeVisible({ timeout: 10_000 })

    await page.getByLabel('Prénom *').fill('TestSuccession')
    await page.getByLabel('Nom *').fill('AmanaE2E')
    await page.getByLabel('Email *').fill(testEmail)
    await page.getByRole('button', { name: /Créer mon espace/i }).click()

    await expect(page).toHaveURL(/\/onboard\/result\/premium/, {
      timeout: 15_000,
    })
  })

  test('2 indicateurs de complexité aiguillent vers Premium', async ({ page }) => {
    const testEmail = `e2e-premium-2complex-${Date.now()}@amana-test.fr`

    await page.goto('/onboard')

    await page.getByLabel(/Optimiser ma fiscalité/).check()
    await page.getByRole('button', { name: /Continuer/i }).click()

    await page.getByPlaceholder('Ex: 75000').fill('50000')
    await page.getByLabel(/parts d'entreprise/).check()
    await page.getByLabel(/expatrié ou non-résident/i).check()
    await page.getByRole('button', { name: /Continuer/i }).click()

    await page.getByRole('button', { name: /Voir mon profil/i }).click()

    await expect(page.getByText(/Premium/i)).toBeVisible({ timeout: 10_000 })

    await page.getByLabel('Prénom *').fill('TestCpx')
    await page.getByLabel('Nom *').fill('AmanaE2E')
    await page.getByLabel('Email *').fill(testEmail)
    await page.getByRole('button', { name: /Créer mon espace/i }).click()

    await expect(page).toHaveURL(/\/onboard\/result\/premium/, {
      timeout: 15_000,
    })
  })
})
