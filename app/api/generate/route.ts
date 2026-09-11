import { NextRequest, NextResponse } from "next/server";

const FORGE_URL = process.env.FORGE_URL;

export async function POST(request: NextRequest) {
    try {
        if (!FORGE_URL) {
            return NextResponse.json(
                {
                    error: "FORGE_URL が設定されていません",
                },
                { status: 500 }
            );
        }

        const formData = await request.formData();

        const image = formData.get("image");
        const prompt = formData.get("prompt");
        const negativePrompt =
        formData.get("negative_prompt");

        const steps = Number(
            formData.get("steps") ?? 20
        );

        const cfgScale = Number(
            formData.get("cfg_scale") ?? 7
        );

        const denoisingStrength = Number(
            formData.get("denoising_strength") ?? 0.6
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

        if (!(image instanceof File)) {
            return NextResponse.json(
                {
                    error: "画像がありません",
                },
                { status: 400 }
            );
        }

        if (!prompt) {
            return NextResponse.json(
                {
                    error: "Promptがありません",
                },
                { status: 400 }
            );
        }

        // =========================================
        // 画像 → Base64
        // =========================================

        const imageBuffer =
        Buffer.from(
            await image.arrayBuffer()
        );

        const imageBase64 =
        imageBuffer.toString("base64");

        // =========================================
        // Forge img2img
        // =========================================

        const response = await fetch(
            `${FORGE_URL}/sdapi/v1/img2img`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    init_images: [
                        imageBase64,
                    ],

                    prompt: String(prompt),

                                     negative_prompt:
                                     String(negativePrompt ?? ""),

                                     steps,

                                     cfg_scale: cfgScale,

                                     denoising_strength:
                                     denoisingStrength,

                                     width,

                                     height,

                                     sampler_name: sampler,
                }),
            }
        );

        if (!response.ok) {
            const errorText =
            await response.text();

            console.error(
                "Forge error:",
                errorText
            );

            return NextResponse.json(
                {
                    error:
                    "Forgeで画像生成に失敗しました",
                    detail: errorText,
                },
                { status: 502 }
            );
        }

        const data = await response.json();

        // =========================================
        // Forge結果確認
        // =========================================

        if (
            !data.images ||
            !data.images.length
        ) {
            return NextResponse.json(
                {
                    error:
                    "Forgeから画像が返ってきませんでした",
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,

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
    }
}
