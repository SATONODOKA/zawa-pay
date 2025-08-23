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
        role: role || null,
        age: age || null,
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

// メンバーの削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string; memberId: string }> }
) {
  try {
    const { key, memberId } = await params;

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

    // メンバーが立替の支払者または負担者として使用されているかチェック
    const expenseAsPayer = await prisma.expense.findFirst({
      where: { paidById: memberId },
    });

    const expenseAsBeneficiary = await prisma.beneficiary.findFirst({
      where: { memberId },
    });

    if (expenseAsPayer || expenseAsBeneficiary) {
      return NextResponse.json(
        { error: 'このメンバーは立替記録で使用されているため削除できません' },
        { status: 400 }
      );
    }

    // メンバーを削除
    await prisma.member.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ message: 'メンバーを削除しました' });
  } catch (error) {
    console.error('メンバーの削除に失敗しました:', error);
    return NextResponse.json(
      { error: 'メンバーの削除に失敗しました' },
      { status: 500 }
    );
  }
} 