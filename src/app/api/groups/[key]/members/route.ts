import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateMemberSchema } from '@/lib/validation';
import { Role } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const group = await prisma.group.findUnique({
      where: { key },
      include: { members: { where: { isActive: true } } }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // roleとageを含むレスポンス
    return NextResponse.json(group.members.map(m => ({ 
      id: m.id, 
      name: m.name, 
      isActive: m.isActive,
      role: m.role,
      age: m.age
    })));
  } catch (error) {
    console.error('メンバー取得エラー:', error);
    return NextResponse.json({ error: 'メンバーの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const { members } = await request.json();

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'メンバーを指定してください' }, { status: 400 });
    }

    // グループの存在確認
    const group = await prisma.group.findUnique({
      where: { key },
      include: { members: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // メンバー情報の検証と重複チェック
    const validatedMembers: Array<{name: string, role?: string, age?: number | null}> = [];
    
    for (const member of members) {
      if (typeof member === 'string') {
        // 後方互換：文字列の場合はnameのみ
        const existingMember = group.members.find(m => m.name === member);
        if (existingMember) {
          return NextResponse.json({ 
            error: `メンバーは既に存在します: ${member}` 
          }, { status: 400 });
        }
        validatedMembers.push({ name: member, role: Role.MEMBER, age: null });
      } else {
        // オブジェクト形式の場合
        const validation = CreateMemberSchema.safeParse(member);
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'バリデーションエラー', 
            details: validation.error.issues 
          }, { status: 400 });
        }
        
        const existingMember = group.members.find(m => m.name === member.name);
        if (existingMember) {
          return NextResponse.json({ 
            error: `メンバーは既に存在します: ${member.name}` 
          }, { status: 400 });
        }
        
        validatedMembers.push({
          name: member.name,
          role: (member.role as Role) ?? Role.MEMBER,
          age: member.age ?? null
        });
      }
    }

    // 新しいメンバーを追加
    const newMembers = await prisma.member.createMany({
      data: validatedMembers.map(member => ({
        groupId: group.id,
        name: member.name.trim(),
        role: member.role as Role,
        age: member.age
      }))
    });

    return NextResponse.json({ 
      success: true, 
      added: newMembers.count,
      members: validatedMembers 
    }, { status: 201 });
  } catch (error) {
    console.error('メンバー追加エラー:', error);
    return NextResponse.json({ error: 'メンバーの追加に失敗しました' }, { status: 500 });
  }
}
