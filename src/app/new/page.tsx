'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getGroupHistory, saveGroupHistory, type GroupHistory } from '@/lib/storage';

interface MemberData {
  name: string;
  role?: string;
  age?: number;
}

export default function NewGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<string>('MEMBER');
  const [memberAge, setMemberAge] = useState<string>('');
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 最近のグループ
  const [recentGroups, setRecentGroups] = useState<GroupHistory[]>([]);

  useEffect(() => {
    // 最近のグループを取得
    const history = getGroupHistory();
    setRecentGroups(history);
  }, []);

  const addMember = () => {
    if (!memberName.trim()) return;
    if (members.some(m => m.name === memberName.trim())) {
      toast.error('同じ名前のメンバーは追加できません');
      return;
    }

    const memberData: MemberData = {
      name: memberName.trim(),
      role: memberRole !== 'MEMBER' ? memberRole : undefined,
      age: memberAge ? parseInt(memberAge) : undefined,
    };

    setMembers([...members, memberData]);
    setMemberName('');
    setMemberRole('MEMBER');
    setMemberAge('');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMember();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('グループ名を入力してください');
      return;
    }
    if (members.length === 0) {
      toast.error('メンバーを1人以上追加してください');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName.trim(),
          members: members.map(m => ({
            name: m.name,
            role: m.role,
            age: m.age,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'グループ作成に失敗しました');
      }
      
      const { key } = await response.json();
      
      // 履歴に保存
      saveGroupHistory(key, groupName.trim(), members.length);

      toast.success('グループを作成しました');
      router.push(`/group/${key}/share`);
    } catch (error) {
      console.error('グループ作成エラー:', error);
      toast.error(error instanceof Error ? error.message : 'グループ作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      'EXEC': '役員',
      'MANAGER': '部長/課長',
      'SENIOR': '主任/リーダー',
      'MEMBER': '一般',
      'JUNIOR': '新人/インターン',
    };
    return roleNames[role] || role;
  };

  const getRoleAbbr = (role: string) => {
    const roleAbbrs: Record<string, string> = {
      'EXEC': '役',
      'MANAGER': '部課',
      'SENIOR': '主リ',
      'MEMBER': '般',
      'JUNIOR': '新イ',
    };
    return roleAbbrs[role] || role;
  };

  return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 header-margin">
      <div className="w-full max-w-md space-y-6">
        {/* サイト名 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">ざわペイ</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>グループ作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  グループ名
                </label>
                <Input
                  type="text"
                  placeholder="例：沖縄旅行"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メンバー
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="例：田中"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button type="button" onClick={addMember} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* 役職・年齢選択UI */}
                <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        役職（任意）
                      </label>
                      <Select value={memberRole} onValueChange={setMemberRole}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXEC">役員</SelectItem>
                          <SelectItem value="MANAGER">部長/課長</SelectItem>
                          <SelectItem value="SENIOR">主任/リーダー</SelectItem>
                          <SelectItem value="MEMBER">一般</SelectItem>
                          <SelectItem value="JUNIOR">新人/インターン</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        年齢（任意・半角英数）
                      </label>
                      <Input
                        type="text"
                        placeholder="例：30"
                        value={memberAge}
                        onChange={(e) => setMemberAge(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 追加されたメンバーの表示 */}
              {members.length > 0 && (
                <div className="space-y-2">
                  {members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {(member.role && member.role !== 'MEMBER') || member.age ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {member.role && member.role !== 'MEMBER' && (
                              <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                {getRoleAbbr(member.role)}
                              </span>
                            )}
                            {member.age && (
                              <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                {member.age}歳
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeMember(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '作成中...' : 'グループを作成'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 最近のグループ */}
        {recentGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                最近のグループ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentGroups.slice(0, 5).map((group, index) => (
                <div
                  key={group?.id || `group-${index}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => router.push(`/group/${group.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{group.name}</p>
                    <p className="text-sm text-gray-500">
                      {group.memberCount}人 • {new Date(group.lastAccessed).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
