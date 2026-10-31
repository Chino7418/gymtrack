// Condecoración de la tarjeta Peso: medalla con cinta y estrella, en los colores del tema
export default function WeightMedal({ gold = false }) {
  return (
    <svg className={`medal ${gold ? 'medal-gold' : ''}`} viewBox="0 0 40 48" aria-hidden="true">
      <path className="medal-ribbon" d="M10 0 H18 L24 18 H16 Z" />
      <path className="medal-ribbon medal-ribbon-2" d="M30 0 H22 L16 18 H24 Z" />
      <circle className="medal-disc" cx="20" cy="31" r="14" />
      <circle className="medal-ring" cx="20" cy="31" r="10.5" />
      <path className="medal-star" d="M20 23.5 l2.2 4.6 5 .6 -3.7 3.4 1 5 -4.5-2.5 -4.5 2.5 1-5 -3.7-3.4 5-.6 Z" />
    </svg>
  )
}
