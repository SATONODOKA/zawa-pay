'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Member {
  id: string;
  name: string;
  role?: string;
  age?: number | null;
}

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const groupKey = params.key as string;
  const memberId = params.memberId as string;

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const response = await fetch(`/api/groups/${groupKey}/members`);
        if (!response.ok) {
          throw new Error('メンバーが見つかりません');
        }
        const members = await response.json();
        const targetMember = members.find((m: Member) => m.id === memberId);
        
        if (!targetMember) {
          throw new Error('メンバーが見つかりません');
        }

        setMember(targetMember);
        setName(targetMember.name);
        setRole(targetMember.role || 'NONE');
        setAge(targetMember.age?.toString() || '');
      } catch (error) {
        console.error('メンバー取得エラー:', error);
        toast.error('メンバーの読み込みに失敗しました');
        router.push(`/group/${groupKey}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (groupKey && memberId) {
      fetchMember();
    }
  }, [groupKey, memberId, router]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('名前を入力してください');
      return;
    }

    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/groups/${groupKey}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: role === 'NONE' ? null : role,
          age: age ? parseInt(age) : null,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新に失敗しました');
      }

      toast.success('メンバーを更新しました');
      router.push(`/group/${groupKey}`);
    } catch (error) {
      console.error('メンバー更新エラー:', error);
      toast.error('メンバーの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/group/${groupKey}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">メンバーが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 header-margin">
      <div className="max-w-2xl mx-auto">
                       <div className="mb-6">
                 <h1 className="text-2xl font-bold text-gray-900">メンバー情報を編集</h1>
                 <p className="text-gray-600 mt-2">年齢と役職のみ変更できます</p>
               </div>

        <Card>
          <CardHeader>
            <CardTitle>メンバーの詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 名前 */}
            <div className="space-y-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                value={name}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">名前は変更できません</p>
            </div>

            {/* 役職 */}
            <div className="space-y-2">
              <Label htmlFor="role">役職（任意）</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="役職を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">役職なし</SelectItem>
                  <SelectItem value="EXEC">社長</SelectItem>
                  <SelectItem value="MANAGER">部長</SelectItem>
                  <SelectItem value="SENIOR">シニア</SelectItem>
                  <SelectItem value="MEMBER">メンバー</SelectItem>
                  <SelectItem value="JUNIOR">ジュニア</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 年齢 */}
            <div className="space-y-2">
              <Label htmlFor="age">年齢（任意・半角英数）</Label>
              <Input
                id="age"
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="年齢を入力"
                pattern="[0-9]*"
              />
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