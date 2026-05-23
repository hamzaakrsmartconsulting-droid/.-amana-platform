/** Nom affiché admin / UI — priorité full_name, puis prénom + nom. */
export function profileDisplayName(row: {
  full_name?: string | null
  prenom?: string | null
  nom?: string | null
}): string {
  const full = row.full_name?.trim()
  if (full) return full
  const parts = [row.prenom?.trim(), row.nom?.trim()].filter(Boolean)
  if (parts.length) return parts.join(' ')
  return 'Sans nom'
}

export function buildFullName(prenom: string, nom: string): string {
  return [prenom.trim(), nom.trim()].filter(Boolean).join(' ')
}
