import type { AIRecipe } from '@/ai/gemini';
import { allergensOf } from '@/data/catalog';
import type { Recipe } from '@/data/types';
import { newId } from './dates';

/** AI가 만든 레시피를 앱의 레시피 형식으로 바꾼다. 분량은 '추정'으로 남는다. */
export function aiRecipeToRecipe(r: AIRecipe, origin: Recipe['origin'] = 'ai_photo'): Recipe {
  const ingredients = (r.ingredients ?? []).filter((i) => i?.name).map((i) => ({
    name: i.name,
    amount: Number(i.amount) || 1,
    unit: i.unit || '개',
    optional: !!i.optional,
    substitute: i.substitute || undefined,
  }));
  return {
    id: newId('ai_'),
    name: r.name,
    emoji: r.emoji || '🍽️',
    servings: r.servings || 1,
    timeMinutes: r.timeMinutes || 20,
    difficulty: r.difficulty ?? '보통',
    ingredients,
    steps: r.steps ?? [],
    tags: [...(r.tags ?? []), 'AI 생성'],
    nutrition: r.nutrition,
    allergens: allergensOf(ingredients.map((i) => i.name)),
    origin,
    createdAt: new Date().toISOString(),
    videoQuery: r.videoQuery,
    features: r.features,
    aiConfidence: r.confidence,
  };
}
