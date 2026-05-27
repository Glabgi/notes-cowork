import { NextRequest, NextResponse } from 'next/server';
import { generateSlug } from '@/lib/utils';

// Simple in-memory rooms for serverless (use Redis/Supabase for production)
const rooms = new Map<string, {
  slug: string;
  name: string;
  isPrivate: boolean;
  maxParticipants: number;
  createdAt: number;
}>();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, isPrivate, password, maxParticipants } = body;

  const slug = generateSlug();
  const room = {
    slug,
    name: name || `Комната ${slug}`,
    isPrivate: !!isPrivate,
    password,
    maxParticipants: maxParticipants || 10,
    createdAt: Date.now(),
  };

  rooms.set(slug, room);

  return NextResponse.json(room);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (slug) {
    const room = rooms.get(slug);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json(room);
  }

  // Return all public rooms
  const publicRooms = Array.from(rooms.values())
    .filter(r => !r.isPrivate)
    .slice(0, 20);

  return NextResponse.json(publicRooms);
}
