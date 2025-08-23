import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// メンバーの更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string; memberId: string }> }
) {
  try {
    const { key, memberId } = await params;
    const body = await request.json();
    const { name, role, age } = body;

    // グループの存在確認
    const group = await prisma.group.findUnique({
      where: { key },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'グループが見つかりません' },
        { status: 404 }
      );
    }

    // メンバーの存在確認
    const existingMember = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: 'メンバーが見つかりません' },
        { status: 404 }
      );
    }

    // メンバーを更新
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: {
        name,
        role: role === 'NONE' ? null : role,
        age: age ? parseInt(age) : null,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('メンバーの更新に失敗しました:', error);
    return NextResponse.json(
      { error: 'メンバーの更新に失敗しました' },
      { status: 500 }
    );
  }
} 