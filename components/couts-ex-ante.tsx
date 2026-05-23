'use client'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'

interface CoutProduit {
  label: string
  taux: number // en % annuel
  montantEuros?: number // calculé dynamiquement
}

interface CoutsExAnteProps {
  produitNom: string
  produitType: 'scpi' | 'assurance_vie' | 'per' | 'cto'
  montantSouscription: number // en €
  // Frais service (conseiller)
  fraisConseil?: number // % entrée
  fraisConseilAnnuel?: number // % annuel
  // Frais produit (société de gestion / assureur)
  fraisEntree?: number // %
  fraisGestion?: number // % annuel
  fraisPerformance?: number // % annuel (si applicable)
  // Commission courtage perçue par AMANA
  commissionCourtage?: number // % entrée
  commissionCourtageAnnuelle?: number // % annuel
}

export default function CoutsExAnte({
  produitNom,
  produitType,
  montantSouscription,
  fraisConseil = 0,
  fraisConseilAnnuel = 0,
  fraisEntree = 0,
  fraisGestion = 0,
  fraisPerformance = 0,
  commissionCourtage = 0,
  commissionCourtageAnnuelle = 0,
}: CoutsExAnteProps) {
  const calc = (pct: number) => ((pct / 100) * montantSouscription).toFixed(2)

  const lignesFraisService: CoutProduit[] = []
  if (fraisConseil > 0) lignesFraisService.push({ label: 'Honoraires de conseil (entrée)', taux: fraisConseil })
  if (fraisConseilAnnuel > 0) lignesFraisService.push({ label: 'Honoraires de suivi annuel', taux: fraisConseilAnnuel })
  if (commissionCourtage > 0) lignesFraisService.push({ label: 'Commission de placement (versée par la SGP)', taux: commissionCourtage })
  if (commissionCourtageAnnuelle > 0) lignesFraisService.push({ label: 'Commission de suivi annuelle (versée par la SGP)', taux: commissionCourtageAnnuelle })

  const lignesFraisProduit: CoutProduit[] = []
  if (fraisEntree > 0) lignesFraisProduit.push({ label: 'Frais de souscription (produit)', taux: fraisEntree })
  if (fraisGestion > 0) lignesFraisProduit.push({ label: 'Frais de gestion annuels', taux: fraisGestion })
  if (fraisPerformance > 0) lignesFraisProduit.push({ label: 'Frais de performance (indicatif)', taux: fraisPerformance })

  const totalEntreePct = fraisConseil + fraisEntree + commissionCourtage
  const totalAnnuelPct = fraisConseilAnnuel + fraisGestion + fraisPerformance + commissionCourtageAnnuelle

  const labelProduit = {
    scpi: 'SCPI',
    assurance_vie: 'Assurance-vie',
    per: 'PER Individuel',
    cto: 'Compte-Titres',
  }[produitType]

  const Row = ({ label, taux, bold = false }: { label: string; taux: number; bold?: boolean }) => (
    <tr>
      <td style={{
        padding: '10px 12px',
        fontSize: '13px',
        color: bold ? FOREST : '#4a5a49',
        fontWeight: bold ? 700 : 400,
        borderBottom: '1px solid #f0ebe0',
        lineHeight: '1.4',
      }}>
        {label}
      </td>
      <td style={{
        padding: '10px 12px',
        fontSize: '13px',
        color: bold ? FOREST : '#4a5a49',
        fontWeight: bold ? 700 : 400,
        textAlign: 'right',
        borderBottom: '1px solid #f0ebe0',
        whiteSpace: 'nowrap',
      }}>
        {taux > 0 ? `${taux.toFixed(2)} %` : '—'}
      </td>
      <td style={{
        padding: '10px 12px',
        fontSize: '13px',
        color: bold ? FOREST : '#4a5a49',
        fontWeight: bold ? 700 : 400,
        textAlign: 'right',
        borderBottom: '1px solid #f0ebe0',
        whiteSpace: 'nowrap',
      }}>
        {taux > 0 ? `${calc(taux)} €` : '—'}
      </td>
    </tr>
  )

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: `1px solid #d4c9a8`,
      overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* En-tête */}
      <div style={{
        background: '#f8f4ec',
        padding: '16px 20px',
        borderBottom: '1px solid #d4c9a8',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Information coûts ex-ante — MIF2 Art. 24
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: FOREST }}>
              {produitNom} <span style={{ fontWeight: 400, color: '#888', fontSize: '13px' }}>({labelProduit})</span>
            </div>
          </div>
          <div style={{
            padding: '4px 12px',
            background: '#e8f5e9',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: FOREST,
          }}>
            Montant : {montantSouscription.toLocaleString('fr-FR')} €
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f4ec' }}>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#888', textAlign: 'left', borderBottom: '1px solid #d4c9a8' }}>
                Nature des frais
              </th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#888', textAlign: 'right', borderBottom: '1px solid #d4c9a8', whiteSpace: 'nowrap' }}>
                Taux
              </th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#888', textAlign: 'right', borderBottom: '1px solid #d4c9a8', whiteSpace: 'nowrap' }}>
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Frais de service */}
            {lignesFraisService.length > 0 && (
              <>
                <tr>
                  <td colSpan={3} style={{
                    padding: '8px 12px 4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#888',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: '#fafaf8',
                    borderBottom: '1px solid #f0ebe0',
                  }}>
                    A — Frais liés aux services d&apos;investissement (AMANA Patrimoine)
                  </td>
                </tr>
                {lignesFraisService.map((l, i) => <Row key={i} label={l.label} taux={l.taux} />)}
              </>
            )}

            {/* Frais produit */}
            {lignesFraisProduit.length > 0 && (
              <>
                <tr>
                  <td colSpan={3} style={{
                    padding: '8px 12px 4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#888',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: '#fafaf8',
                    borderBottom: '1px solid #f0ebe0',
                  }}>
                    B — Frais liés aux produits financiers (société de gestion / assureur)
                  </td>
                </tr>
                {lignesFraisProduit.map((l, i) => <Row key={i} label={l.label} taux={l.taux} />)}
              </>
            )}

            {/* Totaux */}
            <tr style={{ background: '#f8f4ec' }}>
              <td style={{ padding: '12px', fontSize: '13px', fontWeight: 700, color: FOREST, borderTop: `2px solid ${GOLD}` }}>
                Total frais à l&apos;entrée (A+B)
              </td>
              <td style={{ padding: '12px', fontSize: '13px', fontWeight: 700, color: FOREST, textAlign: 'right', borderTop: `2px solid ${GOLD}`, whiteSpace: 'nowrap' }}>
                {totalEntreePct.toFixed(2)} %
              </td>
              <td style={{ padding: '12px', fontSize: '13px', fontWeight: 700, color: FOREST, textAlign: 'right', borderTop: `2px solid ${GOLD}`, whiteSpace: 'nowrap' }}>
                {calc(totalEntreePct)} €
              </td>
            </tr>
            <tr style={{ background: '#f8f4ec' }}>
              <td style={{ padding: '4px 12px 12px', fontSize: '13px', fontWeight: 700, color: FOREST }}>
                Total frais annuels récurrents
              </td>
              <td style={{ padding: '4px 12px 12px', fontSize: '13px', fontWeight: 700, color: FOREST, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {totalAnnuelPct.toFixed(2)} % /an
              </td>
              <td style={{ padding: '4px 12px 12px', fontSize: '13px', fontWeight: 700, color: FOREST, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {calc(totalAnnuelPct)} € /an
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Avertissements réglementaires */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #d4c9a8',
        background: '#fafaf8',
        fontSize: '12px',
        color: '#888',
        lineHeight: '1.7',
      }}>
        <p style={{ margin: '0 0 6px' }}>
          <strong style={{ color: FOREST }}>Information réglementaire MIF2 :</strong>
          {' '}Ces informations vous sont communiquées conformément à l&apos;article 24 de la directive 2014/65/UE (MIF2) et au règlement délégué 2017/565/UE, avant toute souscription.
        </p>
        <p style={{ margin: 0 }}>
          Les frais indiqués sont des estimations basées sur votre montant de souscription et peuvent varier.
          Les frais de performance, le cas échéant, sont calculés sur la performance excédant le seuil de déclenchement défini dans le prospectus.
          <strong style={{ color: '#666' }}> Tout investissement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.</strong>
        </p>
      </div>
    </div>
  )
}
