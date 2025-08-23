import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 立替の更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string; expenseId: string }> }
) {
  try {
    const { key, expenseId } = await params;
    const body = await request.json();
    const { title, amountYen, paidById, beneficiaryIds } = body;

    // バリデーション
    if (!title || !amountYen || !paidById || !beneficiaryIds || beneficiaryIds.length === 0) {
      return NextResponse.json(
        { error: '必要な項目が不足しています' },
        { status: 400 }
      );
    }

    // グループの存在確認
    const group = await prisma.group.findUnique({
      where: { key },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'グループが見つかりません' },
        { status: 404 }
      );
    }

    // 立替の存在確認
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: '立替が見つかりません' },
        { status: 404 }
      );
    }

    // 立替を更新
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        title,
        amountYen,
        paidById,
        items: {
          deleteMany: {},
          create: beneficiaryIds.map((memberId: string) => ({
            memberId,
          })),
        },
      },
      include: {
        paidBy: true,
        items: {
          include: {
            member: true,
          },
        },
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('立替の更新に失敗しました:', error);
    return NextResponse.json(
      { error: '立替の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 立替の削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string; expenseId: string }> }
) {
  try {
    const { key, expenseId } = await params;

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

    // 立替の存在確認
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: '立替が見つかりません' },
        { status: 404 }
      );
    }

    // 関連データを先に削除
    await prisma.beneficiary.deleteMany({
      where: { expenseId },
    });

    // 立替を削除
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({ message: '立替を削除しました' });
  } catch (error) {
    console.error('立替の削除に失敗しました:', error);
    return NextResponse.json(
      { error: '立替の削除に失敗しました' },
      { status: 500 }
    );
  }
} 