'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role?: string;
  age?: number | null;
}

interface MemberChipsProps {
  members: Member[];
  onEdit: (memberId: string) => void;
}

export function MemberChips({ members, onEdit }: MemberChipsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-1">
          <Badge variant="secondary" className="flex items-center gap-1">
            <span>{member.name}</span>
            {member.role && (
              <span className="text-xs opacity-75">({member.role})</span>
            )}
            {member.age && (
              <span className="text-xs opacity-75">{member.age}歳</span>
            )}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(member.id)}
            className="h-5 w-5 p-0 hover:bg-gray-100"
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
