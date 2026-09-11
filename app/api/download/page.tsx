import { NextRequest } from "next/server";

const FILE_SERVER_URL = process.env.FILE_SERVER_URL!;

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return Response.json(
                {
                    error: "tokenが必要です",
                },
                { status: 400 }
            );
        }

        // ローカルFastAPIへ問い合わせ
        const response = await fetch(
            `${FILE_SERVER_URL}/download/${token}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            const data = await response.json().catch(() => null);

            return Response.json(
                {
                    error:
                    data?.detail ||
                    "画像が見つかりません",
                },
                {
                    status: response.status,
                }
            );
        }

        /*
         * FastAPIから画像を取得
         */
        const image = await response.arrayBuffer();

        /*
         * Vercel経由で画像を返す
         */
        return new Response(image, {
            status: 200,
            headers: {
                "Content-Type":
                response.headers.get("Content-Type") ||
                "image/png",

                "Content-Disposition":
                `attachment; filename="${token}.png"`,

                "Cache-Control":
                "no-store, no-cache, must-revalidate",
            },
        });

    } catch (error) {
        console.error("DOWNLOAD ERROR:", error);

        return Response.json(
            {
                error:
                "ファイルサーバーに接続できません",
            },
            { status: 500 }
        );
    }
}

