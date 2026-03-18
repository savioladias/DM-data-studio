import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parse } from 'path'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 })
    }

    // Create unique filename with timestamp
    const timestamp = Date.now()
    const { ext } = parse(file.name)
    const filename = `${timestamp}${ext}`

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Write file
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Return URL
    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Upload error:', errorMsg)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
