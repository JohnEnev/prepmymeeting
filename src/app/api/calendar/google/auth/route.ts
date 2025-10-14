/**
 * Google Calendar OAuth - Initiate Authentication
 * GET /api/calendar/google/auth?userId=<userId>
 */

import { NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/calendar/google-oauth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Generate authorization URL
    const authUrl = generateAuthUrl(userId);

    // Redirect user to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication" },
      { status: 500 }
    );
  }
}
