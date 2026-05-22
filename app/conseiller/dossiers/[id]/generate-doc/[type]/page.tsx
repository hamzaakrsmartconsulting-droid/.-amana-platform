// app/conseiller/dossiers/[id]/generate-doc/[type]/page.tsx
// Re-expose le wizard partagé sous le parcours conseiller.
// Le composant détecte l'URL courante via usePathname() et adapte
// automatiquement les liens de retour vers /conseiller/dossiers/[id].
export { default } from '@/app/admin/dossiers/[id]/generate-doc/[type]/page'
