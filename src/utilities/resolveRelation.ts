// Payload при depth-N отдаёт relationship объектом, если документ разрешился,
// и строкой/числом (id), если нет. Эти хелперы прячут union от компонентов,
// чтобы каждый потребитель не объявлял свой typeof-guard заново.

export const isResolvedRelation = <T extends object>(
  relation: T | string | number | null | undefined,
): relation is T => typeof relation === 'object' && relation !== null

export const resolveRelation = <T extends object>(
  relation: T | string | number | null | undefined,
): T | null => (isResolvedRelation(relation) ? relation : null)
