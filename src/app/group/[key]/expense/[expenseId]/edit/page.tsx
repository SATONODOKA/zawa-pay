'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const groupKey = params.key as string;
  const expenseId = params.expenseId as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState('');
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // グループメンバーを取得
        const membersResponse = await fetch(`/api/groups/${groupKey}/members`);
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setMembers(membersData);
        }

        // 立替データを取得
        const expensesResponse = await fetch(`/api/groups/${groupKey}/expenses`);
        if (expensesResponse.ok) {
          const expensesData = await expensesResponse.json();
          const targetExpense = expensesData.find((e: Expense) => e.id === expenseId);
          if (targetExpense) {
            setExpense(targetExpense);
            setTitle(targetExpense.title);
            setAmount(targetExpense.amountYen.toString());
            setPaidById(targetExpense.paidBy.id);
            setSelectedBeneficiaries(targetExpense.beneficiaries.map((b: { id: string; name: string }) => b.id));
          }
        }
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [groupKey, expenseId]);

  const handleSave = async () => {
    if (!title.trim() || !amount || !paidById || selectedBeneficiaries.length === 0) {
      alert('すべての項目を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/groups/${groupKey}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          amountYen: parseInt(amount),
          paidById,
          beneficiaryIds: selectedBeneficiaries,
        }),
      });

      if (response.ok) {
        router.push(`/group/${groupKey}`);
      } else {
        const error = await response.json();
        alert(error.error || '立替の更新に失敗しました');
      }
    } catch (error) {
      console.error('立替の更新に失敗しました:', error);
      alert('立替の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/group/${groupKey}`);
  };

  const toggleBeneficiary = (memberId: string) => {
    setSelectedBeneficiaries(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600">立替が見つかりません</div>
          <Button onClick={handleCancel} className="mt-4">
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 header-margin">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">立替を編集</h1>
          <p className="text-gray-600 mt-2">立替の内容を修正してください</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>立替の詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* タイトル */}
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="立替のタイトルを入力"
              />
            </div>

            {/* 金額 */}
            <div className="space-y-2">
              <Label htmlFor="amount">金額</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
              />
            </div>

            {/* 支払者 */}
            <div className="space-y-2">
              <Label>支払者</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <Button
                    key={member.id}
                    type="button"
                    variant={paidById === member.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaidById(member.id)}
                  >
                    {member.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* 負担者 */}
            <div className="space-y-2">
              <Label>負担者（複数選択可）</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`beneficiary-${member.id}`}
                      checked={selectedBeneficiaries.includes(member.id)}
                      onCheckedChange={() => toggleBeneficiary(member.id)}
                    />
                    <Label htmlFor={`beneficiary-${member.id}`}>
                      {member.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 