import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
    try {
        const roles = await prisma.authRole.findMany();
        return NextResponse.json({ data: roles });
    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
    }
}