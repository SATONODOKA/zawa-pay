import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { generateGroupKey } from '@/lib/key';
import { roundToUnit } from '@/lib/format';
import { CreateGroupSchema } from '@/lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = req.body;
    const validatedData = CreateGroupSchema.safeParse(body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        error: 'バリデーションエラー', 
        details: validatedData.error.issues 
      });
    }

    const { name, members, roundingUnit } = validatedData.data;

    // グループキーの生成（重複チェック付き）
    let key: string;
    let attempts = 0;
    do {
      key = generateGroupKey();
      attempts++;
      if (attempts > 10) {
        return res.status(500).json({ error: 'グループキーの生成に失敗しました' });
      }
    } while (await prisma.group.findUnique({ where: { key } }));

    // グループ作成
    const group = await prisma.group.create({
      data: {
        key,
        name,
        roundingUnit: roundToUnit(roundingUnit, 1), // 1に丸める
      }
    });

    // メンバー作成（role/age対応）
    await prisma.member.createMany({
      data: members.map((member: string | { name: string; role?: 'EXEC' | 'MANAGER' | 'SENIOR' | 'MEMBER' | 'JUNIOR'; age?: number | null }) => {
        if (typeof member === 'string') {
          // 後方互換：文字列の場合はnameのみ
          return {
            groupId: group.id,
            name: member,
            role: 'MEMBER',
            age: null,
          };
        } else {
          // オブジェクト形式の場合（role/ageを含む可能性あり）
          return {
            groupId: group.id,
            name: member.name,
            role: member.role ?? 'MEMBER',
            age: member.age ?? null,
          };
        }
      })
    });

    return res.status(201).json({ key });
  } catch (error) {
    console.error('グループ作成エラー:', error);
    return res.status(500).json({ error: 'グループ作成に失敗しました' });
  }
}
