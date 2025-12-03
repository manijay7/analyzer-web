import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/api-security';
import { hash } from 'bcryptjs';

export async function GET() {
  const { error, status } = await validateRequest('manage_users');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const users = await prisma.user.findMany({
        select: { 
            id: true, 
            name: true, 
            email: true, 
            role: true, 
            avatar: true, 
            status: true 
        }
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error("Failed to fetch users", e);
    return NextResponse.json({ error: "Database Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
    const { error, status } = await validateRequest('manage_users');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const body = await req.json();
        const { name, email, role, status: userStatus, password } = body;

        if (!email || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Default password if not provided (for admin generated users)
        const passwordToHash = password || "Welcome123!";
        const hashedPassword = await hash(passwordToHash, 12);
        
        // Simple avatar generation
        const avatar = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                role: role || 'ANALYST',
                status: userStatus || 'active',
                password: hashedPassword,
                avatar
            },
            select: { 
                id: true, 
                name: true, 
                email: true, 
                role: true, 
                avatar: true, 
                status: true 
            }
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (e) {
        console.error("Failed to create user", e);
        return NextResponse.json({ error: "Failed to create user. Email might be duplicate." }, { status: 500 });
    }
}