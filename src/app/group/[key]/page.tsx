'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberChips } from '@/components/MemberChips';
import { ExpenseCard } from '@/components/ExpenseCard';
import { CopyButton } from '@/components/CopyButton';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { Plus, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { yen } from '@/lib/format';
import { saveGroupHistory } from '@/lib/storage';
import { computeGroupTransfers } from '@/lib/expenseSettlement';
import { greedySettle } from '@/lib/settlement';
import { useExpenseTiltStore } from '@/stores/expenseTiltStore';
import { useExpenseAdjustStore } from '@/stores/expenseAdjustStore';

interface Member {
  id: string;
  name: string;
  role?: string;
  age?: number | null;
}

interface Expense {
  id: string;
  title: string;
  amountYen: number;
  paidBy: { id: string; name: string };
  beneficiaries: { id: string; name: string }[];
  createdAt: string;
}

interface Settlement {
  fromId: string;
  from: string;
  toId: string;
  to: string;
  amount: number;
}

interface Summary {
  members: Member[];
  nets: { memberId: string; name: string; net: number }[];
  settlements: Settlement[];
  settlementText: string;
  roundingUnit: number;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [unit, setUnit] = useState<1 | 10 | 100 | 1000>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  // Zustandストアから傾斜モードと調整値を取得
  const tiltMap = useExpenseTiltStore((s) => s.map);
  const getTiltMode = useExpenseTiltStore((s) => s.get);
  const adjustments = useExpenseAdjustStore((s) => s.adjustments);
  
  // クライアントサイドで清算計算（調整ストアの値を優先）
  const summary = useMemo(() => {
    if (members.length === 0 || expenses.length === 0) return null;
    
    // メンバーID→メンバー情報のマップを作成
    const membersById = Object.fromEntries(members.map(m => [m.id, m]));
    
    // 各立替の傾斜モードに応じて清算計算
    const expenseData = expenses.map(e => ({
      id: e.id,
      amountYen: e.amountYen,
      paidById: e.paidBy.id,
      beneficiaries: e.beneficiaries.map(b => ({ memberId: b.id })),
    }));
    
    const nets = computeGroupTransfers({
      expenses: expenseData,
      membersById,
      roundingUnit: unit,
      getTiltMode,
    });
    
    // 調整ストアの値があれば、それを優先してnetsを更新
    const adjustedNets = { ...nets };
    
    Object.entries(adjustments).forEach(([expenseId, expenseAdjustments]) => {
      Object.entries(expenseAdjustments).forEach(([toId, fromAdjustments]) => {
        // 調整された金額を適用
        Object.entries(fromAdjustments).forEach(([fromId, adjustedAmount]) => {
          // 元の計算結果を調整
          const originalAmount = nets[fromId] || 0;
          const adjustment = adjustedAmount - (nets[toId] || 0);
          
          adjustedNets[fromId] = originalAmount - adjustment;
          adjustedNets[toId] = (adjustedNets[toId] || 0) + adjustment;
        });
      });
    });
    
    // メンバーID→メンバー名のマップを作成
    const memberNames = Object.fromEntries(members.map(m => [m.id, m.name]));
    
    // netsを配列形式に変換
    const netsArray = Object.entries(adjustedNets).map(([memberId, net]) => ({
      memberId,
      name: memberNames[memberId],
      net,
    }));
    
    // Greedy清算
    const settlements = greedySettle(netsArray, unit);
    
    // コピー用テキスト生成
    const settlementText = settlements.length > 0
      ? `清算方法（丸め単位：¥${unit}）
${settlements.map(s => `${s.from} → ${s.to}：${yen(s.amount)}`).join('\n')}
（合計受取＝合計支払＝${yen(settlements.reduce((sum, s) => sum + s.amount, 0))}）`
      : '清算の必要はありません';
    
    return {
      members,
      nets: netsArray,
      settlements,
      settlementText,
      roundingUnit: unit,
    };
  }, [members, expenses, unit, tiltMap, adjustments]);

  const groupKey = params.key as string;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // メンバー取得
      const membersResponse = await fetch(`/api/groups/${groupKey}/members`);
      if (!membersResponse.ok) {
        throw new Error('グループが見つかりません');
      }
      const membersData = await membersResponse.json();
      setMembers(membersData);
      
      // グループ名を仮設定（実際はAPIで取得する必要あり）
      setGroupName('グループ');

      // 立替履歴取得
      const expensesResponse = await fetch(`/api/groups/${groupKey}/expenses`);
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      }


      
      // グループ履歴を保存
      saveGroupHistory(groupKey, 'グループ', membersData.length);
    } catch (error) {
      console.error('データ取得エラー:', error);
      toast.error('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnitChange = (value: string) => {
    const newUnit = parseInt(value) as 1 | 10 | 100 | 1000;
    setUnit(newUnit);
  };

  const handleEdit = (expenseId: string) => {
    router.push(`/group/${groupKey}/expense/${expenseId}/edit`);
  };

  const handleDelete = (expenseId: string) => {
    setExpenseToDelete(expenseId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;

    try {
      const response = await fetch(`/api/groups/${groupKey}/expenses/${expenseToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 立替リストから削除
        setExpenses(prev => prev.filter(e => e.id !== expenseToDelete));
        toast.success('立替を削除しました');
      } else {
        const error = await response.json();
        toast.error(error.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('削除に失敗しました:', error);
      toast.error('削除に失敗しました');
    } finally {
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  useEffect(() => {
    if (groupKey) {
      fetchData();
    }
  }, [groupKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{groupName}</h1>
          <div className="mt-2">
            <MemberChips members={members} />
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 左カラム：アクション */}
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-4">
                <Button 
                  onClick={() => router.push(`/group/${groupKey}/payment/new`)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  立替え記録を追加
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右カラム：清算結果 */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    清算方法
                  </CardTitle>
                  {summary && (
                    <div className="flex items-center gap-2">
                      <Select value={unit.toString()} onValueChange={handleUnitChange}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1円単位</SelectItem>
                          <SelectItem value="10">10円単位</SelectItem>
                          <SelectItem value="100">100円単位</SelectItem>
                          <SelectItem value="1000">1000円単位</SelectItem>
                        </SelectContent>
                      </Select>
                      <CopyButton text={summary.settlementText}>
                        <Copy className="h-4 w-4" />
                      </CopyButton>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {summary && summary.settlements.length > 0 ? (
                  <div className="space-y-2">
                    {summary.settlements.map((settlement, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>
                          {settlement.from} → {settlement.to}
                        </span>
                        <span className="font-bold">{yen(settlement.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">清算の必要はありません</p>
                )}




              </CardContent>
            </Card>
          </div>
        </div>

        {/* 立替履歴 */}
        <div>
          <h2 className="text-xl font-bold mb-4">立替履歴</h2>
          {expenses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {expenses.map((expense) => (
                <ExpenseCard 
                  key={expense.id} 
                  expense={expense} 
                  members={members}
                  roundingUnit={unit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                まだ立替記録がありません
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="立替を削除"
        description="この立替を削除しますか？この操作は取り消せません。"
      />
    </div>
  );
}
