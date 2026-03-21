import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const bgmDir = path.join(process.cwd(), 'public', 'assets', 'bgm');
  try {
    if (!fs.existsSync(bgmDir)) {
      fs.mkdirSync(bgmDir, { recursive: true });
      return NextResponse.json({ files: [] });
    }
    const files = fs.readdirSync(bgmDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'));
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ files: [] }, { status: 500 });
  }
}
