'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/CopyButton';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const groupKey = params.key as string;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/group/${groupKey}` : '';

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await fetch(`/api/groups/${groupKey}/members`);
        if (!response.ok) {
          throw new Error('グループが見つかりません');
        }
        const members = await response.json();
        if (members.length > 0) {
          // グループ情報を取得するため、仮にmembers APIからグループ名を取得（実際は別APIが必要かも）
          const groupResponse = await fetch(`/api/groups/${groupKey}`);
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          setGroupName(groupData.name);
        }
        }
      } catch (error) {
        console.error('グループ取得エラー:', error);
        toast.error('グループの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (groupKey) {
      fetchGroup();
    }
  }, [groupKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 header-margin">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            グループを作成しました！
          </h1>
          <p className="text-gray-600">
            まずはURLをコピーして共有しましょう
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>共有用URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm break-all">
              {shareUrl}
            </div>
            
            <CopyButton text={shareUrl} className="w-full">
              コピー
            </CopyButton>
            
            <Button 
              onClick={() => router.push(`/group/${groupKey}`)} 
              className="w-full"
            >
              グループページへ進む
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
