import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { sendJoinRequestNotification } from '@/lib/email'
import { z } from 'zod'

const joinRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = joinRequestSchema.parse(body)

    // Check if email already exists (either as user or pending request)
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const existingRequest = await db.joinRequest.findUnique({ where: { email } })
    if (existingRequest) {
      return NextResponse.json({ error: 'Request already submitted for this email' }, { status: 409 })
    }

    // Hash password and create join request
    const hashed = await bcrypt.hash(password, 12)
    const request_ = await db.joinRequest.create({
      data: { name, email, password: hashed },
      select: { id: true, email: true, name: true },
    })

    // Notify admin by email
    await sendJoinRequestNotification(request_)

    return NextResponse.json(request_, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
