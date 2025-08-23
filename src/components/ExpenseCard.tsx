'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { yen } from '@/lib/format';
import { useExpenseTiltStore } from '@/stores/expenseTiltStore';
import { useExpenseAdjustStore, hasAnyAdjustments } from '@/stores/expenseAdjustStore';
import { computeSingleExpenseSettlement } from '@/lib/expenseSettlement';
import { redistributeKeepSumEqual, snap } from '@/lib/redistribute';
import { useMemo, useState, useEffect } from 'react';

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
  onEdit?: (expenseId: string) => void;
  onDelete?: (expenseId: string) => void;
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
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const groupTotal = rows.reduce((s, r) => s + r.amountYen, 0);
  const current: Record<string, number> =
    saved ?? Object.fromEntries(rows.map(r => [r.fromId, r.amountYen]));

  // 初期値の設定とcurrent変更時の同期
  useEffect(() => {
    // currentのキーが変わった時のみ更新
    const currentKeys = Object.keys(current);
    const inputKeys = Object.keys(inputValues);
    
    // キーの数や内容が変わった時のみ更新
    if (currentKeys.length !== inputKeys.length || 
        !currentKeys.every(key => inputKeys.includes(key))) {
      const newInputValues: Record<string, string> = {};
      Object.entries(current).forEach(([fromId, amount]) => {
        newInputValues[fromId] = amount.toString();
      });
      setInputValues(newInputValues);
    }
  }, [current]);

  // useExpenseAdjustStoreの状態を監視
  const savedAdjustments = useExpenseAdjustStore(s => s.getGroup(expenseId, toId));
  
  // 傾斜モードの変更も監視
  const tiltMode = useExpenseTiltStore(s => s.get(expenseId));
  
  // 手動調整がクリアされた時、または傾斜モードが変更された時にinputValuesを更新
  useEffect(() => {
    if (!savedAdjustments) {
      // 手動調整がない場合は、currentの値でinputValuesを更新
      const newInputValues: Record<string, string> = {};
      Object.entries(current).forEach(([fromId, amount]) => {
        newInputValues[fromId] = amount.toString();
      });
      setInputValues(newInputValues);
    }
  }, [savedAdjustments]);

  // 傾斜モードが変更された時にinputValuesを更新
  useEffect(() => {
    // 手動調整がない場合のみ更新
    if (!savedAdjustments) {
      const newInputValues: Record<string, string> = {};
      Object.entries(current).forEach(([fromId, amount]) => {
        newInputValues[fromId] = amount.toString();
      });
      setInputValues(newInputValues);
    }
  }, [tiltMode, savedAdjustments]);

  // 調整後の値を取得する関数
  const getAdjustedAmount = (fromId: string) => {
    if (savedAdjustments && savedAdjustments[fromId] !== undefined) {
      return savedAdjustments[fromId];
    }
    return current[fromId];
  };

  // 調整後の値を含むcurrentを作成
  const adjustedCurrent = Object.fromEntries(
    Object.keys(current).map(fromId => [
      fromId, 
      getAdjustedAmount(fromId)
    ])
  );

  const handleAmountChange = (fromId: string, newAmount: number) => {
    // 入力値を丸め単位にスナップ
    const snappedAmount = snap(newAmount, roundingUnit);
    // 0以上、グループ合計以下に制限
    const clampedAmount = Math.max(0, Math.min(snappedAmount, groupTotal));
    
    // 再配分を実行（調整後の値を使用）
    const next = redistributeKeepSumEqual(adjustedCurrent, groupTotal, fromId, clampedAmount);
    
    // 全員分の金額を更新
    for (const [fid, v] of Object.entries(next)) {
      setAmount(expenseId, toId, fid, v);
    }

    // 入力値も全員分更新（再配分後の値で）
    // 現在の値と異なる場合のみ更新
    setInputValues(prev => {
      let hasChanges = false;
      const updated = { ...prev };
      
      for (const [fid, v] of Object.entries(next)) {
        const newValue = v.toString();
        if (updated[fid] !== newValue) {
          updated[fid] = newValue;
          hasChanges = true;
        }
      }
      
      return hasChanges ? updated : prev;
    });
  };

  const handleInputChange = (fromId: string, inputValue: string) => {
    // 現在の値と同じ場合は更新しない
    if (inputValues[fromId] === inputValue) {
      return;
    }
    
    // 入力値をローカル状態に保存
    setInputValues(prev => ({ ...prev, [fromId]: inputValue }));
    
    // 数値として有効な場合のみ処理
    const numValue = Number(inputValue);
    if (!isNaN(numValue) && inputValue !== '') {
      handleAmountChange(fromId, numValue);
    }
  };

  const handleInputBlur = (fromId: string) => {
    const inputValue = inputValues[fromId];
    const numValue = Number(inputValue);
    
    if (isNaN(numValue) || inputValue === '') {
      // 無効な値の場合は現在の金額に戻す
      const currentValue = current[fromId].toString();
      if (inputValues[fromId] !== currentValue) {
        setInputValues(prev => ({ ...prev, [fromId]: currentValue }));
      }
    } else {
      // 有効な値の場合は丸め単位にスナップ
      const snapped = snap(numValue, roundingUnit);
      if (snapped !== numValue) {
        handleAmountChange(fromId, snapped);
      }
    }
  };

  return (
    <div className="space-y-1">
                       {Object.entries(current).map(([fromId]) => (
                   <div key={fromId} className="flex items-center gap-3 rounded bg-neutral-50 px-3 py-2">
                     <span className="w-24 truncate text-sm">{membersById[fromId]?.name} →</span>
          
          {/* スライダー */}
          <input
            type="range"
            min={0}
            max={groupTotal}
            step={roundingUnit}
            value={getAdjustedAmount(fromId)}
            onChange={(e) => {
              const val = Number(e.target.value);
              handleAmountChange(fromId, val);
            }}
            className="flex-1"
          />
          
          {/* 直接入力フィールド */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">¥</span>
            <input
              type="text"
              value={inputValues[fromId] || ''}
              onChange={(e) => handleInputChange(fromId, e.target.value)}
              onBlur={() => handleInputBlur(fromId)}
              onKeyDown={(e) => {
                // Enterキーでフォーカスアウト
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-20 text-right text-sm font-mono border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors"
              placeholder="0"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExpenseCard({ expense, members, roundingUnit, onEdit, onDelete }: ExpenseCardProps) {
  const mode = useExpenseTiltStore((s) => s.get(expense.id));
  const setMode = useExpenseTiltStore((s) => s.set);
  const tiltOn = mode === "rough";
  const hasManual = useExpenseAdjustStore((s) => hasAnyAdjustments(s, expense.id));

  const handleEdit = (expenseId: string) => {
    if (onEdit) {
      onEdit(expenseId);
    }
  };

  const handleDelete = (expenseId: string) => {
    if (onDelete) {
      onDelete(expenseId);
    }
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
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-muted-foreground">
            {expense.paidBy.name} が支払い
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleEdit(expense.id)}
              className="h-7 px-2 text-xs"
            >
              編集
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDelete(expense.id)}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              削除
            </Button>
          </div>
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
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">送金すべき金額:</div>
                <div className="text-xs text-gray-500">
                  丸め単位: ¥{roundingUnit.toLocaleString()}
                </div>
              </div>
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
          
          {/* 2ボタン構成の傾斜制御 */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => {
                  // 手動配分を破棄してから、傾斜モードに
                  useExpenseAdjustStore.getState().clearExpense(expense.id);
                  setMode(expense.id, "rough");
                }}
                disabled={hasManual}
                variant="outline"
                size="sm"
                className={hasManual ? "opacity-50 cursor-not-allowed" : ""}
                aria-label="傾斜をかける"
                title={hasManual ? "手動調整をリセットすると再度かけられます" : ""}
              >
                傾斜をかける
              </Button>

              <Button
                type="button"
                onClick={() => {
                  // 手動配分を破棄して均等割に戻す
                  useExpenseAdjustStore.getState().clearExpense(expense.id);
                  setMode(expense.id, "equal");
                }}
                variant="outline"
                size="sm"
                className=""
                aria-label="均等割に戻す"
              >
                均等割に戻す
              </Button>
            </div>

            {/* 現在モードの説明 */}
            <div className="mt-1 text-xs text-neutral-500 text-center">
              {mode === "rough" ? "傾斜（役職×年齢）適用中" : "均等割（全員同額）"}
              {hasManual && " ／ 手動調整あり（傾斜をかける を使うにはリセットが必要）"}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {new Date(expense.createdAt).toLocaleString('ja-JP')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
