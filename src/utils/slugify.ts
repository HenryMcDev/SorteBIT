/**
 * Converte um texto em um slug amigável (sem acentos, sem caracteres especiais, sem espaços e em letras minúsculas).
 * Exemplo: "Boné BIT - Acelera Jovens" -> "bone-bit-acelera-jovens"
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Separa os acentos das letras (ex: 'é' vira 'e' + '´')
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais não alfanuméricos (mantém de forma simplificada letras, números, espaços, hifens e underscores)
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .replace(/--+/g, '-'); // Remove hífens duplicados
}
