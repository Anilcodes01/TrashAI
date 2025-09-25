import { getPendingInvitationCount } from "@/app/actions/InvitationActions";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await getPendingInvitationCount();
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}