import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await db.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
