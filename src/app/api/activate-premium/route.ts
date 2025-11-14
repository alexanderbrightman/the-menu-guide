import { NextResponse } from 'next/server'
import { getSecurityHeaders } from '@/lib/security'

export async function GET() {
  return NextResponse.json({ message: 'Activate premium endpoint' }, { status: 200, headers: getSecurityHeaders() })
}

export async function POST() {
  return NextResponse.json({ message: 'Activate premium endpoint' }, { status: 200, headers: getSecurityHeaders() })
}
