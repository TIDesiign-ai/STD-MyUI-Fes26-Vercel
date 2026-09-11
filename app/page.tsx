"use client";

import { useState } from "react";

const templates = {
    portrait: {
        name: "似顔絵",
        prompt:
        "masterpiece, best quality, anime style, detailed face, clean lineart",
        negative_prompt:
        "bad anatomy, bad hands, low quality, blurry, distorted face",
        steps: 20,
        cfg_scale: 7,
        denoising_strength: 0.6,
        width: 1024,
        height: 1024,
        sampler: "DPM++ 2M Karras",
    },

    anime: {
        name: "アニメ",
        prompt:
        "masterpiece, best quality, anime illustration, beautiful detailed character",
        negative_prompt:
        "low quality, blurry, bad anatomy, bad hands",
        steps: 20,
        cfg_scale: 7,
        denoising_strength: 0.55,
        width: 1024,
        height: 1024,
        sampler: "Euler a",
    },
};

export default function Home() {
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState("");

    const [template, setTemplate] = useState("portrait");

    const [prompt, setPrompt] = useState(
        templates.portrait.prompt
    );

    const [negativePrompt, setNegativePrompt] = useState(
        templates.portrait.negative_prompt
    );

    const [steps, setSteps] = useState(
        templates.portrait.steps
    );

    const [cfgScale, setCfgScale] = useState(
        templates.portrait.cfg_scale
    );

    const [denoising, setDenoising] = useState(
        templates.portrait.denoising_strength
    );

    const [width, setWidth] = useState(
        templates.portrait.width
    );

    const [height, setHeight] = useState(
        templates.portrait.height
    );

    const [sampler, setSampler] = useState(
        templates.portrait.sampler
    );

    const [generating, setGenerating] = useState(false);

    const [result, setResult] = useState("");

    const [message, setMessage] = useState("");

    // =========================
    // 画像選択
    // =========================

    const handleImage = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (!file) return;

        setImage(file);

        setPreview(URL.createObjectURL(file));

        setResult("");

        setMessage("");
    };

    // =========================
    // テンプレート
    // =========================

    const changeTemplate = (
        key: keyof typeof templates
    ) => {
        const t = templates[key];

        setTemplate(key);

        setPrompt(t.prompt);
        setNegativePrompt(t.negative_prompt);
        setSteps(t.steps);
        setCfgScale(t.cfg_scale);
        setDenoising(t.denoising_strength);
        setWidth(t.width);
        setHeight(t.height);
        setSampler(t.sampler);
    };

    // =========================
    // 生成
    // =========================

    const generate = async () => {
        if (!image) {
            setMessage("画像を選択してください");
            return;
        }

        setGenerating(true);
        setMessage("生成しています...");
        setResult("");

        try {
            /*
             * 次の段階で
             *
             * POST /api/generate
             *
             * にこのFormDataを送る
             */

            const formData = new FormData();

            formData.append("image", image);
            formData.append("prompt", prompt);
            formData.append(
                "negative_prompt",
                negativePrompt
            );

            formData.append(
                "steps",
                String(steps)
            );

            formData.append(
                "cfg_scale",
                String(cfgScale)
            );

            formData.append(
                "denoising_strength",
                String(denoising)
            );

            formData.append(
                "width",
                String(width)
            );

            formData.append(
                "height",
                String(height)
            );

            formData.append(
                "sampler",
                sampler
            );

            console.log(
                "GENERATE REQUEST",
                Object.fromEntries(formData.entries())
            );

            /*
             * 仮動作
             *
             * Forge API接続は次の段階で実装
             */

            await new Promise((resolve) =>
            setTimeout(resolve, 1000)
            );

            setMessage(
                "UI完成。次にForge APIへ接続します。"
            );

        } catch (error) {
            console.error(error);

            setMessage(
                "生成中にエラーが発生しました"
            );
        } finally {
            setGenerating(false);
        }
    };

    return (
        <main className="page">

        {/* ========================= */}
        {/* Header */}
        {/* ========================= */}

        <header className="header">

        <div>
        <p className="eyebrow">
        TID DESIGN AI / FESTIVAL
        </p>

        <h1>
        AI 似顔絵メーカー
        </h1>

        <p className="subtitle">
        画像をアップロードして、
        AIでアレンジします。
        </p>
        </div>

        </header>


        {/* ========================= */}
        {/* Main */}
        {/* ========================= */}

        <div className="layout">

        {/* ========================= */}
        {/* Left */}
        {/* ========================= */}

        <section className="panel">

        <h2>
        画像
        </h2>

        <label className="upload">

        <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleImage}
        />

        <div className="uploadIcon">
        ↑
        </div>

        <strong>
        {image
            ? image.name
            : "画像を選択"}
            </strong>

            <span>
            PNG / JPG / WEBP
            </span>

            </label>


            {/* Preview */}

            {preview && (
                <div className="preview">

                <img
                src={preview}
                alt="uploaded"
                />

                </div>
            )}


            {/* ========================= */}
            {/* Template */}
            {/* ========================= */}

            <h2>
            テンプレート
            </h2>

            <div className="templates">

            {Object.entries(
                templates
            ).map(([key, value]) => (

                <button
                key={key}
                className={
                    template === key
                    ? "template active"
                    : "template"
                }
                onClick={() =>
                    changeTemplate(
                        key as keyof typeof templates
                    )
                }
                >

                {value.name}

                </button>

            ))}

            </div>


            {/* ========================= */}
            {/* Prompt */}
            {/* ========================= */}

            <h2>
            プロンプト
            </h2>

            <label className="field">

            <span>
            Prompt
            </span>

            <textarea
            value={prompt}
            onChange={(e) =>
                setPrompt(
                    e.target.value
                )
            }
            />

            </label>


            <label className="field">

            <span>
            Negative Prompt
            </span>

            <textarea
            value={negativePrompt}
            onChange={(e) =>
                setNegativePrompt(
                    e.target.value
                )
            }
            />

            </label>


            {/* ========================= */}
            {/* Parameters */}
            {/* ========================= */}

            <h2>
            設定
            </h2>

            <div className="parameters">

            <label className="field">

            <span>
            Steps
            </span>

            <input
            type="number"
            min="1"
            max="100"
            value={steps}
            onChange={(e) =>
                setSteps(
                    Number(e.target.value)
                )
            }
            />

            </label>


            <label className="field">

            <span>
            CFG Scale
            </span>

            <input
            type="number"
            min="1"
            max="30"
            step="0.5"
            value={cfgScale}
            onChange={(e) =>
                setCfgScale(
                    Number(e.target.value)
                )
            }
            />

            </label>


            <label className="field">

            <span>
            Denoising
            </span>

            <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={denoising}
            onChange={(e) =>
                setDenoising(
                    Number(e.target.value)
                )
            }
            />

            </label>


            <label className="field">

            <span>
            Sampler
            </span>

            <select
            value={sampler}
            onChange={(e) =>
                setSampler(
                    e.target.value
                )
            }
            >

            <option>
            Euler a
            </option>

            <option>
            Euler
            </option>

            <option>
            DPM++ 2M Karras
            </option>

            <option>
            DPM++ SDE Karras
            </option>

            </select>

            </label>


            <label className="field">

            <span>
            Width
            </span>

            <input
            type="number"
            step="64"
            value={width}
            onChange={(e) =>
                setWidth(
                    Number(e.target.value)
                )
            }
            />

            </label>


            <label className="field">

            <span>
            Height
            </span>

            <input
            type="number"
            step="64"
            value={height}
            onChange={(e) =>
                setHeight(
                    Number(e.target.value)
                )
            }
            />

            </label>

            </div>


            {/* ========================= */}
            {/* Generate */}
            {/* ========================= */}

            <button
            className="generate"
            disabled={generating}
            onClick={generate}
            >

            {generating
                ? "生成中..."
                : "✨ 生成する"}

                </button>


                {message && (
                    <p className="message">
                    {message}
                    </p>
                )}

                </section>


                {/* ========================= */}
                {/* Result */}
                {/* ========================= */}

                <section className="panel resultPanel">

                <h2>
                生成結果
                </h2>

                <div className="result">

                {result ? (

                    <img
                    src={result}
                    alt="generated"
                    />

                ) : (

                    <div className="empty">

                    <div>
                    ✨
                    </div>

                    <span>
                    生成した画像が
                    ここに表示されます
                    </span>

                    </div>

                )}

                </div>


                {result && (
                    <button className="download">
                    ↓ ダウンロード
                    </button>
                )}

                </section>

                </div>

                </main>
    );
}
