import { getInvitations } from "@/app/actions/InvitationActions";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const invitations = await getInvitations();
    return NextResponse.json(invitations);
  } catch (error) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}