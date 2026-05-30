import { describe, expect, it } from 'vitest'
import { validateOnboardingPassword } from '@/lib/onboarding/onboarding-service'

describe('validateOnboardingPassword', () => {
  it('accepte un mot de passe de 8 caractères ou plus', () => {
    expect(validateOnboardingPassword('12345678')).toBeNull()
  })

  it('refuse un mot de passe trop court', () => {
    expect(validateOnboardingPassword('abc')).toMatch(/8 caractères/)
  })

  it('refuse un mot de passe vide', () => {
    expect(validateOnboardingPassword('')).toMatch(/8 caractères/)
  })
})
