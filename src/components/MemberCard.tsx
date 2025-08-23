'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role?: string;
  age?: number | null;
}

interface MemberCardProps {
  member: Member;
  onEdit: (memberId: string) => void;
  onDelete: (memberId: string) => void;
}

export function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  const handleEdit = () => {
    onEdit(member.id);
  };

  const handleDelete = () => {
    onDelete(member.id);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="font-medium text-lg">{member.name}</div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="h-7 px-2 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              編集
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {member.role && (
            <Badge variant="secondary">
              {member.role}
            </Badge>
          )}
          {member.age && (
            <Badge variant="outline">
              {member.age}歳
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 