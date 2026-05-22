// tests/e2e/funnel-mass.spec.ts
// Sprint Agents IA v20 · 30 avril 2026
//
// Test E2E du tunnel Mass : profil patrimoine 50 k€, 0 indicateur de
// complexité → doit aiguiller vers /onboard/result/mass.

import { test, expect } from '@playwright/test'

test.describe('Funnel public — tunnel Mass', () => {
  test('profil simple < 100 k€ aiguille vers Mass', async ({ page }) => {
    // Email de test unique pour éviter collisions
    const testEmail = `e2e-mass-${Date.now()}@amana-test.fr`

    await page.goto('/onboard')

    // Étape 1 — Objectifs
    await expect(page.getByRole('heading', { name: /Quel est votre objectif/i })).toBeVisible()
    await page.getByLabel(/Préparer ma retraite/).check()
    await page.getByRole('button', { name: /Continuer/i }).click()

    // Étape 2 — Situation patrimoniale
    await expect(page.getByRole('heading', { name: /situation patrimoniale/i })).toBeVisible()
    await page.getByPlaceholder('Ex: 75000').fill('50000')
    await page.getByPlaceholder('Ex: 45000').fill('40000')
    await page.getByPlaceholder('Ex: 30000').fill('25000')
    await page.getByPlaceholder('Ex: 500').fill('500')
    // Statut familial : célibataire (par défaut)
    // Pas d'indicateurs cochés
    await page.getByRole('button', { name: /Continuer/i }).click()

    // Étape 3 — Sensibilité Sharia
    await expect(page.getByRole('heading', { name: /sensibilité Sharia/i })).toBeVisible()
    // Sensibilité moyenne par défaut
    await page.getByRole('button', { name: /Voir mon profil/i }).click()

    // Étape 4 — Identité, doit afficher "Mass — parcours 100% digital"
    await expect(page.getByText(/Mass.*100% digital/i)).toBeVisible({
      timeout: 10_000,
    })
    await page.getByLabel('Prénom *').fill('TestMass')
    await page.getByLabel('Nom *').fill('AmanaE2E')
    await page.getByLabel('Email *').fill(testEmail)
    await page.getByRole('button', { name: /Créer mon espace/i }).click()

    // Redirection vers /onboard/result/mass
    await expect(page).toHaveURL(/\/onboard\/result\/mass/, { timeout: 15_000 })
    await expect(page.getByText(/Votre espace AMANA est créé/i)).toBeVisible()
    await expect(page.getByText(/parcours 100% digital/i)).toBeVisible()
  })
})
