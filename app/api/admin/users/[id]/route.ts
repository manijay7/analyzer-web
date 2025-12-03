import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/api-security';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error, status } = await validateRequest('manage_users');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const body = await req.json();
    const { name, email, role, status: userStatus } = body;

    const updatedUser = await prisma.user.update({
        where: { id: params.id },
        data: {
            name,
            email,
            role,
            status: userStatus
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

    return NextResponse.json(updatedUser);
  } catch (e) {
    console.error("Failed to update user", e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const { error, status } = await validateRequest('manage_users');
    if (error) return NextResponse.json({ error }, { status });

    try {
        await prisma.user.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Failed to delete user", e);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}