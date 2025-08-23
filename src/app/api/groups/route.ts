import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateGroupKey } from '@/lib/key';
import { roundToUnit } from '@/lib/format';
import { CreateGroupSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateGroupSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ 
        error: 'バリデーションエラー', 
        details: validatedData.error.issues 
      }, { status: 400 });
    }

    const { name, members, roundingUnit } = validatedData.data;

    // グループキーの生成（重複チェック付き）
    let key: string;
    let attempts = 0;
    do {
      key = generateGroupKey();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json({ error: 'グループキーの生成に失敗しました' }, { status: 500 });
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

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error('グループ作成エラー:', error);
    return NextResponse.json({ error: 'グループ作成に失敗しました' }, { status: 500 });
  }
}
