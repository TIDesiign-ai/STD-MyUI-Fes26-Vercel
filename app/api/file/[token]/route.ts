import { NextRequest } from "next/server";

const FILE_SERVER_URL = process.env.FILE_SERVER_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const response = await fetch(
      `${FILE_SERVER_URL}/download/${token}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return new Response("画像が見つかりません", {
        status: response.status,
      });
    }

    const image = await response.arrayBuffer();

    return new Response(image, {
      headers: {
        "Content-Type":
        response.headers.get("Content-Type") || "image/png",

                        "Content-Disposition":
                        `attachment; filename="${token}.png"`,

                        "Cache-Control":
                        "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("DOWNLOAD ERROR:", error);

    return new Response(
      "ファイルサーバーに接続できません",
      {
        status: 500,
      }
    );
  }
}
