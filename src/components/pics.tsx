import { Image } from 'expo-image';
import { Text } from 'react-native';

import { findCatalog } from '@/data/catalog';
import { FOOD_IMAGES, INGREDIENT_IMAGES } from '@/data/images';
import { BUILTIN_RECIPES } from '@/data/recipes';

/**
 * 음식·재료 손그림. 그림이 없으면(AI 레시피, 드문 재료) 이모지로 대신 보여 준다.
 * 음식은 레시피 id로 먼저 찾고, 없으면 같은 이름의 기본 레시피 그림을 쓴다(AI가 만든 '김치찌개' 등).
 */

const BY_NAME = new Map(BUILTIN_RECIPES.map((r) => [r.name.replace(/\s/g, ''), r.id]));

export function foodImage(id?: string, name?: string) {
  if (id && FOOD_IMAGES[id]) return FOOD_IMAGES[id];
  const byName = name ? BY_NAME.get(name.replace(/\s/g, '')) : undefined;
  return byName ? FOOD_IMAGES[byName] : undefined;
}

export function ingredientImage(name: string) {
  const c = findCatalog(name);
  return c ? INGREDIENT_IMAGES[c.name] : undefined;
}

function Fallback({ emoji, size }: { emoji: string; size: number }) {
  return <Text style={{ fontSize: size * 0.78, lineHeight: size * 1.05, width: size * 1.1, textAlign: 'center' }}>{emoji}</Text>;
}

export function FoodPic({ id, name, emoji, size }: { id?: string; name?: string; emoji: string; size: number }) {
  const src = foodImage(id, name);
  if (!src) return <Fallback emoji={emoji} size={size} />;
  return <Image source={src} style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
}

export function IngPic({ name, emoji, size }: { name: string; emoji: string; size: number }) {
  const src = ingredientImage(name);
  if (!src) return <Fallback emoji={emoji} size={size} />;
  return <Image source={src} style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
}

/** 냉장고 칸의 한 칸: 남은 음식은 음식 그림, 나머지는 재료 그림 */
export function ItemPic({ item, size }: { item: { name: string; emoji: string; kind?: string }; size: number }) {
  return item.kind === 'leftover' ? <FoodPic name={item.name} emoji={item.emoji} size={size} /> : <IngPic name={item.name} emoji={item.emoji} size={size} />;
}
