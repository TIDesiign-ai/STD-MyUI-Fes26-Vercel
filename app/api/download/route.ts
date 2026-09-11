import { NextRequest, NextResponse } from "next/server";

const FILE_SERVER_URL = process.env.FILE_SERVER_URL!;

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        {
          error: "パスワードが必要です",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FILE_SERVER_URL}/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
          data.detail ||
          "認証に失敗しました",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "ファイルサーバーに接続できません",
      },
      {
        status: 500,
      }
    );
  }
}
