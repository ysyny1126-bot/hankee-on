
/**
 * 오잘먹 캐릭터 목록.
 * 지금은 콘셉트 시안(여러 캐릭터가 한 장에 있는 참고 이미지)만 있어서,
 * 도형으로 그린 '임시 캐릭터'를 쓴다. 이름도 가칭이다.
 * 완성 캐릭터 이미지가 나오면 image에 require('@/assets/characters/파일.png')만 넣으면 그 이미지로 바뀐다.
 */
export type CharacterId = 'sprout' | 'power' | 'greens';

export interface CharacterDef {
  id: CharacterId;
  name: string; // 가칭
  body: string; // 몸 색
  cheek: string;
  accent: string; // 소품 색(새싹, 머리띠, 잎)
  accessory: 'sprout' | 'headband' | 'leaves';
  image?: number; // 완성 에셋 연결 자리: require('@/assets/characters/파일.png')
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'sprout', name: '몽실이(가칭)', body: '#FBF4EA', cheek: '#FFC9B5', accent: '#7FAE5B', accessory: 'sprout' },
  { id: 'power', name: '든든이(가칭)', body: '#FBF4EA', cheek: '#FFC9B5', accent: '#E07A4F', accessory: 'headband' },
  { id: 'greens', name: '청경이(가칭)', body: '#CFE5B8', cheek: '#F6B9A8', accent: '#5E9E4A', accessory: 'leaves' },
];

export function getCharacter(id: string | undefined): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
