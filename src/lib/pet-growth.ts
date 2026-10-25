export type PetStage = { key: "baby" | "teen" | "adult"; label: string; scale: string; next?: number };

/** Питомец растёт по дням с момента, как его завели: 0–2 малыш, 3–6 подросток, 7+ взрослый. */
export const getPetStage = (adoptedAt?: string | null): PetStage & { days: number } => {
  const days = adoptedAt ? Math.max(0, Math.floor((Date.now() - new Date(adoptedAt).getTime()) / 86400000)) : 0;
  if (days < 3) return { key: "baby", label: "🍼 Малыш", scale: "scale-75", next: 3 - days, days };
  if (days < 7) return { key: "teen", label: "🎒 Подросток", scale: "scale-90", next: 7 - days, days };
  return { key: "adult", label: "👑 Взрослый", scale: "scale-110", days };
};

export const daysWord = (n: number) =>
  n % 10 === 1 && n % 100 !== 11 ? "день" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "дня" : "дней";
