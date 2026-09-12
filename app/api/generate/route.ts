import { NextRequest, NextResponse } from "next/server";

type ForgeServer = {
    id: string;
    url: string;
};

// =========================================================
// Forgeサーバー一覧
// Vercel Environment Variables:
// FORGE_01_URL
// FORGE_02_URL
// ...
// FORGE_40_URL
// =========================================================

function getForgeServers(): ForgeServer[] {
    const servers: ForgeServer[] = [];

    for (let i = 1; i <= 40; i++) {
        const id = String(i).padStart(2, "0");
        const url = process.env[`FORGE_${id}_URL`];

        if (url) {
            servers.push({
                id,
                url: url.replace(/\/+$/, ""),
            });
        }
    }

    // 旧FORGE_URLも使えるようにする
    if (servers.length === 0 && process.env.FORGE_URL) {
        servers.push({
            id: "01",
            url: process.env.FORGE_URL.replace(/\/+$/, ""),
        });
    }

    return servers;
}


// =========================================================
// Forgeのアクセス状態
//
// accessed = このNext.jsインスタンスが使用中
// =========================================================

const accessState = new Map<string, boolean>();


// =========================================================
// Forgeが空いているか確認
// =========================================================

async function isForgeAvailable(
    server: ForgeServer
): Promise<boolean> {

    try {
        const response = await fetch(
            `${server.url}/sdapi/v1/progress`,
            {
                method: "GET",

                signal: AbortSignal.timeout(3000),

                                     cache: "no-store",
            }
        );

        if (!response.ok) {
            return false;
        }

        const data = await response.json();

        // すでにNext.js側で確保済み
        if (accessState.get(server.id)) {
            return false;
        }

        // Forgeが生成中
        if (
            data.state?.job_count !== undefined &&
            data.state.job_count > 0
        ) {
            return false;
        }

        // Forge内部で処理中
        if (data.progress > 0 && data.progress < 1) {
            return false;
        }

        return true;

    } catch (error) {

        console.error(
            `[Forge ${server.id}] status check failed:`,
            error
        );

        return false;
    }
}


// =========================================================
// 空いているForgeを探す
// =========================================================

async function findAvailableForge(
    servers: ForgeServer[]
): Promise<ForgeServer | null> {

    // 全Forgeを並列チェック
    const results = await Promise.all(
        servers.map(async (server) => {

            const available =
            await isForgeAvailable(server);

            return {
                server,
                available,
            };
        })
    );

    // 空いているサーバーだけ
    const availableServers =
    results
    .filter(
        (result) =>
        result.available
    )
    .map(
        (result) =>
        result.server
    );

    if (
        availableServers.length === 0
    ) {
        return null;
    }

    // 空いている中からランダム
    const index = Math.floor(
        Math.random() *
        availableServers.length
    );

    return availableServers[index];
}


// =========================================================
// POST /api/generate
// =========================================================

export async function POST(
    request: NextRequest
) {

    let selectedServer:
    ForgeServer | null = null;

    try {

        // =====================================================
        // Forge一覧
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
        // 空いているForgeを探す
        // =====================================================

        selectedServer =
        await findAvailableForge(
            servers
        );

        if (!selectedServer) {

            return NextResponse.json(
                {
                    error:
                    "現在利用可能な生成サーバーがありません。少し待ってから再度お試しください。",
                },
                {
                    status: 503,
                    headers: {
                        "Retry-After": "5",
                    },
                }
            );
        }


        // =====================================================
        // ロック
        // =====================================================

        accessState.set(
            selectedServer.id,
            true
        );

        console.log(
            `[Forge ${selectedServer.id}] LOCKED`
        );


        // =====================================================
        // Forge img2img
        // =====================================================

        const response =
        await fetch(
            `${selectedServer.url}/sdapi/v1/img2img`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({

                    init_images: [
                        imageBase64,
                    ],

                    prompt:
                    String(prompt),

                                     negative_prompt:
                                     String(
                                         negativePrompt ??
                                         ""
                                     ),

                                     steps,

                                     cfg_scale:
                                     cfgScale,

                                     denoising_strength:
                                     denoisingStrength,

                                     width,

                                     height,

                                     sampler_name:
                                     sampler,
                }),

                signal:
                AbortSignal.timeout(
                    10 * 60 * 1000
                ),
            }
        );


        // =====================================================
        // Forgeエラー
        // =====================================================

        if (!response.ok) {

            const errorText =
            await response.text();

            console.error(
                `[Forge ${selectedServer.id}] error:`,
                errorText
            );

            return NextResponse.json(
                {
                    error:
                    "Forgeで画像生成に失敗しました",

                    server:
                    selectedServer.id,

                    detail:
                    errorText,
                },
                { status: 502 }
            );
        }


        // =====================================================
        // 結果
        // =====================================================

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
                    selectedServer.id,
                },
                { status: 502 }
            );
        }


        console.log(
            `[Forge ${selectedServer.id}] COMPLETE`
        );


        return NextResponse.json({

            success: true,

            server:
            selectedServer.id,

            image:
            `data:image/png;base64,${data.images[0]}`,
        });


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
            { status: 500 }
        );

    } finally {

        // =====================================================
        // 必ずロック解除
        // =====================================================

        if (selectedServer) {

            accessState.set(
                selectedServer.id,
                false
            );

            console.log(
                `[Forge ${selectedServer.id}] UNLOCKED`
            );
        }
    }
}
