'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { yen } from '@/lib/format';
import { useExpenseTiltStore } from '@/stores/expenseTiltStore';
import { useExpenseAdjustStore } from '@/stores/expenseAdjustStore';
import { computeSingleExpenseSettlement } from '@/lib/expenseSettlement';
import { redistributeKeepSumEqual, snap } from '@/lib/redistribute';
import { useMemo } from 'react';

interface ExpenseCardProps {
  expense: {
    id: string;
    title: string;
    amountYen: number;
    paidBy: { id: string; name: string };
    beneficiaries: { id: string; name: string }[];
    createdAt: string;
  };
  members: Array<{
    id: string;
    name: string;
    role?: string;
    age?: number | null;
  }>;
  roundingUnit: 1 | 10 | 100 | 1000;
}

// スライダー付き送金表示コンポーネント
function GroupTransfersWithSliders({
  expenseId,
  toId,
  rows,
  roundingUnit = 1,
  membersById
}: {
  expenseId: string;
  toId: string;
  rows: Array<{ fromId: string; amountYen: number }>;
  roundingUnit: number;
  membersById: Record<string, { name: string }>;
}) {
  const saved = useExpenseAdjustStore(s => s.getGroup(expenseId, toId));
  const setAmount = useExpenseAdjustStore(s => s.setAmount);

  const groupTotal = rows.reduce((s, r) => s + r.amountYen, 0);
  const current: Record<string, number> =
    saved ?? Object.fromEntries(rows.map(r => [r.fromId, r.amountYen]));

  return (
    <div className="space-y-1">
      {Object.entries(current).map(([fromId, amt]) => (
        <div key={fromId} className="flex items-center gap-3 rounded bg-neutral-50 px-3 py-2">
          <span className="w-24 truncate">{membersById[fromId]?.name} →</span>
          <input
            type="range"
            min={0}
            max={groupTotal}
            step={roundingUnit}
            value={amt}
            onChange={(e) => {
              const val = snap(Number(e.target.value), roundingUnit);
              const next = redistributeKeepSumEqual(current, groupTotal, fromId, val);
              for (const [fid, v] of Object.entries(next)) setAmount(expenseId, toId, fid, v);
            }}
            className="flex-1"
          />
          <span className="w-24 text-right font-semibold">¥{amt.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function ExpenseCard({ expense, members, roundingUnit }: ExpenseCardProps) {
  const mode = useExpenseTiltStore((s) => s.get(expense.id));
  const setMode = useExpenseTiltStore((s) => s.set);
  const tiltOn = mode === "rough";

  const handleTiltToggle = () => {
    setMode(expense.id, tiltOn ? "equal" : "rough");
  };

  // 清算計算
  const settlement = useMemo(() => {
    const membersById = Object.fromEntries(members.map(m => [m.id, m]));
    
    const expenseData = {
      amountYen: expense.amountYen,
      paidById: expense.paidBy.id,
      beneficiaries: expense.beneficiaries.map(b => ({ memberId: b.id })),
    };
    
    return computeSingleExpenseSettlement({
      expense: expenseData,
      membersById,
      roundingUnit,
      tiltMode: mode,
    });
  }, [expense, members, roundingUnit, mode]);

  // 送金すべき金額を計算
  const transfers = useMemo(() => {
    const transfers: Array<{ from: string; to: string; amount: number; fromId: string; toId: string }> = [];
    
    // 支払者（プラス）から受益者（マイナス）への送金を計算
    const paidByNet = settlement[expense.paidBy.id] || 0;
    
    if (paidByNet > 0) {
      // 支払者が受け取るべき金額がある場合
      expense.beneficiaries.forEach(beneficiary => {
        const beneficiaryNet = settlement[beneficiary.id] || 0;
        if (beneficiaryNet < 0) {
          const amount = Math.min(paidByNet, -beneficiaryNet);
          if (amount > 0) {
            transfers.push({
              from: beneficiary.name,
              to: expense.paidBy.name,
              fromId: beneficiary.id,
              toId: expense.paidBy.id,
              amount,
            });
          }
        }
      });
    }
    
    return transfers;
  }, [settlement, expense]);

  // スライダー用のデータ構造
  const sliderData = useMemo(() => {
    const data: Record<string, Array<{ fromId: string; amountYen: number }>> = {};
    
    transfers.forEach(transfer => {
      if (!data[transfer.toId]) {
        data[transfer.toId] = [];
      }
      data[transfer.toId].push({
        fromId: transfer.fromId,
        amountYen: transfer.amount
      });
    });
    
    return data;
  }, [transfers]);

  const membersById = useMemo(() => 
    Object.fromEntries(members.map(m => [m.id, m])), 
    [members]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="font-medium">{expense.title}</div>
          <div className="text-lg font-bold text-right">{yen(expense.amountYen)}</div>
        </div>
        <div className="text-sm text-muted-foreground">
          {expense.paidBy.name} が支払い
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">負担者:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {expense.beneficiaries.map((beneficiary) => (
                <Badge key={beneficiary.id} variant="outline" className="text-xs">
                  {beneficiary.name}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* 送金すべき金額（スライダー付き） */}
          {transfers.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-sm font-medium mb-2">送金すべき金額:</div>
              <div className="space-y-3">
                {Object.entries(sliderData).map(([toId, rows]) => (
                  <div key={toId} className="space-y-2">
                    <div className="text-xs text-green-600 font-medium">
                      → {membersById[toId]?.name}
                    </div>
                    <GroupTransfersWithSliders
                      expenseId={expense.id}
                      toId={toId}
                      rows={rows}
                      roundingUnit={roundingUnit}
                      membersById={membersById}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 傾斜トグルボタン */}
          <div className="pt-2 border-t">
            <Button
              onClick={handleTiltToggle}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {tiltOn ? '傾斜を解除' : '傾斜をかける'}
            </Button>
            {tiltOn && (
              <p className="text-xs text-neutral-500 mt-1 text-center">
                傾斜（役職×年齢）適用中
              </p>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {new Date(expense.createdAt).toLocaleString('ja-JP')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
