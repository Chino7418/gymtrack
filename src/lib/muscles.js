// Grupos musculares: los valores son los del CHECK de la tabla exercises (sin tildes);
// para mostrar se usan las etiquetas con tilde.
export const GRUPOS = ['Pecho', 'Espalda', 'Hombros', 'Biceps', 'Triceps', 'Piernas', 'Gluteos', 'Abdomen', 'Otro']

const LABELS = { Biceps: 'Bíceps', Triceps: 'Tríceps', Gluteos: 'Glúteos' }
export const grupoLabel = (g) => LABELS[g] ?? g
