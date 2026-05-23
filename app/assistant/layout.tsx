// app/assistant/layout.tsx
// Sprint Agents IA v6 · 29 avril 2026
// Layout englobant toutes les pages /assistant/* avec la sidebar dossiers à gauche

import AssistantShell from '@/components/assistant-shell'

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AssistantShell>{children}</AssistantShell>
}
