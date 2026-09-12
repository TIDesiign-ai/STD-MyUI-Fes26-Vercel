import { NextRequest, NextResponse } from "next/server";

type ForgeServer = {
    id: string;
    url: string;
};

// =========================================================
// Forgeサーバー一覧
// =========================================================

function getForgeServers(): ForgeServer[] {
    const servers: ForgeServer[] = [];

    for (let i = 1; i <= 40; i++) {
        const id = String(i).padStart(2, "0");

        const url =
        process.env[`FORGE_${id}_URL`];

        if (url) {
            servers.push({
                id,
                url: url.replace(/\/+$/, ""),
            });
        }
    }

    // 40台設定していない場合の互換用
    if (servers.length === 0) {
        const fallback =
        process.env.FORGE_URL;

        if (fallback) {
            servers.push({
                id: "01",
                url: fallback.replace(/\/+$/, ""),
            });
        }
    }

    return servers;
}


// =========================================================
// サーバーをシャッフル
// =========================================================

function shuffle<T>(array: T[]): T[] {
    const result = [...array];

    for (
        let i = result.length - 1;
    i > 0;
    i--
    ) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [
            result[i],
            result[j],
        ] = [
            result[j],
            result[i],
        ];
    }

    return result;
}


// =========================================================
// POST /api/generate
// =========================================================

export async function POST(
    request: NextRequest
) {
    try {

        // =====================================================
        // Forge一覧取得
        // =====================================================

        const servers =
        getForgeServers();

        if (servers.length === 0) {
            return NextResponse.json(
                {
                    error:
                    "Forgeサーバーが設定されていません",
                },
                { status: 500 }
            );
        }


        // =====================================================
        // FormData
        // =====================================================

        const formData =
        await request.formData();

        const image =
        formData.get("image");

        const prompt =
        formData.get("prompt");

        const negativePrompt =
        formData.get(
            "negative_prompt"
        );

        const steps = Number(
            formData.get("steps") ?? 20
        );

        const cfgScale = Number(
            formData.get("cfg_scale") ?? 7
        );

        const denoisingStrength =
        Number(
            formData.get(
                "denoising_strength"
            ) ?? 0.6
        );

        const width = Number(
            formData.get("width") ?? 1024
        );

        const height = Number(
            formData.get("height") ?? 1024
        );

        const sampler =
        String(
            formData.get("sampler") ??
                "DPM++ 2M Karras"
        );


        // =====================================================
        // 入力チェック
        // =====================================================

        if (!(image instanceof File)) {
            return NextResponse.json(
                {
                    error:
                    "画像がありません",
                },
                { status: 400 }
            );
        }

        if (!prompt) {
            return NextResponse.json(
                {
                    error:
                    "Promptがありません",
                },
                { status: 400 }
            );
        }


        // =====================================================
        // 画像 → Base64
        // =====================================================

        const imageBuffer =
        Buffer.from(
            await image.arrayBuffer()
        );

        const imageBase64 =
        imageBuffer.toString(
            "base64"
        );


        // =====================================================
        // Forge用JSON
        // =====================================================

        const forgeBody = {
            init_images: [
                imageBase64,
            ],

            prompt: String(prompt),

            negative_prompt:
            String(
                negativePrompt ?? ""
            ),

            steps,

            cfg_scale: cfgScale,

            denoising_strength:
            denoisingStrength,

            width,

            height,

            sampler_name: sampler,
        };


        // =====================================================
        // サーバーをシャッフル
        //
        // 毎回同じGPUに集中しないようにする
        // =====================================================

        const candidates =
        shuffle(servers);


        console.log(
            "Forge candidates:",
            candidates.map(
                (server) =>
                server.id
            )
        );


        // =====================================================
        // Forgeへ送信
        // =====================================================

        let lastError:
        | unknown = null;

        for (const server of candidates) {

            try {

                console.log(
                    `[Forge ${server.id}] generating...`
                );


                const response =
                await fetch(
                    `${server.url}/sdapi/v1/img2img`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                            "application/json",
                        },

                        body: JSON.stringify(
                            forgeBody
                        ),

                        // 長時間生成対策
                        signal:
                        AbortSignal.timeout(
                            10 * 60 * 1000
                        ),
                    }
                );


                // =================================================
                // Forge HTTPエラー
                // =================================================

                if (!response.ok) {

                    const errorText =
                    await response.text();

                    console.error(
                        `[Forge ${server.id}] HTTP ${response.status}`,
                        errorText
                    );

                    /*
                     * Forgeがちゃんと応答した場合は、
                     * 別GPUへ勝手に再送しない。
                     *
                     * 生成処理が実行済みの可能性があるため。
                     */

                    return NextResponse.json(
                        {
                            error:
                            "Forgeで画像生成に失敗しました",

                            server:
                            server.id,

                            detail:
                            errorText,
                        },
                        {
                            status: 502,
                        }
                    );
                }


                // =================================================
                // JSON
                // =================================================

                const data =
                await response.json();


                if (
                    !data.images ||
                    !data.images.length
                ) {

                    return NextResponse.json(
                        {
                            error:
                            "Forgeから画像が返ってきませんでした",

                            server:
                            server.id,
                        },
                        {
                            status: 502,
                        }
                    );
                }


                console.log(
                    `[Forge ${server.id}] generation complete`
                );


                // =================================================
                // 成功
                // =================================================

                return NextResponse.json({
                    success: true,

                    server:
                    server.id,

                    image:
                    `data:image/png;base64,${data.images[0]}`,
                });

            } catch (error) {

                // =================================================
                // 接続失敗
                // =================================================

                console.error(
                    `[Forge ${server.id}] connection failed`,
                    error
                );

                lastError = error;

                /*
                 * サーバー自体に接続できない場合は
                 * 次のForgeへ。
                 */

                continue;
            }
        }


        // =====================================================
        // 全Forge失敗
        // =====================================================

        console.error(
            "All Forge servers failed:",
            lastError
        );

        return NextResponse.json(
            {
                error:
                "現在利用可能なForgeサーバーがありません",
            },
            {
                status: 503,
            }
        );

    } catch (error) {

        console.error(
            "Generate error:",
            error
        );

        return NextResponse.json(
            {
                error:
                "画像生成中にエラーが発生しました",
            },
            {
                status: 500,
            }
        );
    }
}
