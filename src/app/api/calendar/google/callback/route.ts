/**
 * Google Calendar OAuth - Handle Callback
 * GET /api/calendar/google/callback?code=<code>&state=<userId>
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeTokens,
} from "@/lib/calendar/google-oauth";
import {
  getOrCreateNotificationSettings,
  getUser,
} from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    // Check if user denied access
    if (error === "access_denied") {
      return NextResponse.json(
        {
          success: false,
          message: "You denied access to your calendar.",
        },
        { status: 200 }
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 }
      );
    }

    const userId = state;

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in database
    await storeTokens(userId, tokens);

    // Create default notification settings if they don't exist
    await getOrCreateNotificationSettings(userId);

    console.log(`Calendar connected for user ${userId}`);

    // Notify user via WhatsApp
    const user = await getUser(userId);
    if (user?.whatsapp_id) {
      await sendWhatsAppMessage(
        user.whatsapp_id,
        "🎉 Your Google Calendar has been connected successfully! I'll now send you proactive prep suggestions 24 hours before your meetings.\n\nUse /calendar_settings to customize your notification preferences."
      );
    }

    // Return success page
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calendar Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin: 0 0 10px 0;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #5568d3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Calendar Connected!</h1>
            <p>Your Google Calendar has been successfully connected to PrepMyMeeting.</p>
            <p>I'll send you proactive prep suggestions 24 hours before your meetings via WhatsApp.</p>
            <p style="font-size: 14px; margin-top: 20px;">You can close this window and return to WhatsApp.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            .error-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin: 0 0 10px 0;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>Connection Failed</h1>
            <p>Sorry, we couldn't connect your calendar. Please try again later.</p>
            <p style="font-size: 14px; margin-top: 20px;">You can close this window and return to WhatsApp to try again with /connect_calendar</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  }
}
