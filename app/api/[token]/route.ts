import { NextRequest } from "next/server";

const FILE_SERVER_URL = process.env.FILE_SERVER_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const response = await fetch(
    `${FILE_SERVER_URL}/download/${params.token}`,
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
                      `attachment; filename="${params.token}.png"`,

                      "Cache-Control": "no-store",
    },
  });
}
