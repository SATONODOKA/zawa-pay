import { useState } from 'react';

export default function Home() {
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const memberList = members.split(',').map(m => m.trim()).filter(m => m);
      
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName,
          members: memberList,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`グループ作成成功！
グループキー: ${data.key}`);
        window.location.href = `/group/${data.key}`;
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ざわペイ
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            会計管理アプリ
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="groupName" className="sr-only">
                グループ名
              </label>
              <input
                id="groupName"
                name="groupName"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="グループ名"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="members" className="sr-only">
                メンバー（カンマ区切り）
              </label>
              <input
                id="members"
                name="members"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="田中, 佐藤, 鈴木（カンマ区切り）"
                value={members}
                onChange={(e) => setMembers(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? '作成中...' : 'グループ作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}