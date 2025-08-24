import { NextApiRequest, NextApiResponse } from 'next';

// Mock data for demonstration
const mockMembers = [
  { id: '1', name: '田中', role: 'EXEC', age: 30 },
  { id: '2', name: '佐藤', role: 'MEMBER', age: 25 },
  { id: '3', name: '鈴木', role: 'MEMBER', age: 28 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return mock members data
    return res.status(200).json(mockMembers);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}