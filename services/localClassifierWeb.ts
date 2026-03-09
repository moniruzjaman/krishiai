import * as tflite from '@tensorflow/tfjs-tflite';

// KrishiAI Web — Local MobileNetV2 Classifier (TFLite in Browser)

export interface LocalClassifierResult {
    diseaseKey: string;
    confidence: number;
    isHighConfidence: boolean;
    allScores: { label: string; score: number }[];
    source: 'local-tflite';
}

const CLASS_NAMES = [
    'brinjal_borer',
    'healthy',
    'nitrogen_deficiency',
    'potato_late_blight',
    'rice_blast',
    'rice_blight',
    'rice_brown_spot',
    'rice_sheath_blight',
    'rice_stem_borer',
    'tomato_blight',
    'tomato_leaf_curl',
    'wheat_rust',
    'zinc_deficiency',
];

const CONFIDENCE_THRESHOLD = 0.70;
const IMG_SIZE = 224;

let modelInstance: tflite.TFLiteModel | null = null;
let modelReady = false;

export async function loadLocalModel(): Promise<boolean> {
    if (modelReady && modelInstance) return true;
    try {
        // Requires a valid wasm backend setup for tflite
        tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.9/dist/');

        // TFLite model loaded from public folder (ensure you copy the model here!)
        modelInstance = await tflite.loadTFLiteModel('/models/crop_disease.tflite');
        modelReady = true;
        console.log('[LocalClassifierWeb] ✅ MobileNetV2 TFLite loaded successfully!');
        return true;
    } catch (err) {
        console.warn('[LocalClassifierWeb] ❌ Load failed. Ensure /models/crop_disease.tflite exists:', err);
        return false;
    }
}

function preprocessImage(imgElement: HTMLImageElement): Int32Array | Float32Array {
    const canvas = document.createElement('canvas');
    canvas.width = IMG_SIZE;
    canvas.height = IMG_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    ctx.drawImage(imgElement, 0, 0, IMG_SIZE, IMG_SIZE);
    const imageData = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE);
    const data = imageData.data;

    // TFLite model is INT8, values are 0-255.
    const pixels = new Int32Array(IMG_SIZE * IMG_SIZE * 3);
    let p = 0;
    for (let i = 0; i < data.length; i += 4) {
        pixels[p++] = data[i];     // R
        pixels[p++] = data[i + 1]; // G
        pixels[p++] = data[i + 2]; // B
    }
    return pixels;
}

export async function classifyLocally(base64Image: string): Promise<LocalClassifierResult | null> {
    try {
        if (!modelReady) {
            const loaded = await loadLocalModel();
            if (!loaded) return null;
        }

        if (!modelInstance) return null;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const pixels = preprocessImage(img);
                    // TFJS wraps running the model
                    // @ts-ignore - The types for tfjs-tflite expect tensors
                    const outputTensor = modelInstance.predict(
                        window.tf ? window.tf.tensor(pixels, [1, IMG_SIZE, IMG_SIZE, 3], 'int32') : pixels
                    );

                    let raw: number[] = [];
                    if (outputTensor && typeof outputTensor.dataSync === 'function') {
                        raw = Array.from(outputTensor.dataSync());
                    } else {
                        // raw fallback if the prediction returned an array directly
                        raw = outputTensor as any;
                    }

                    const total = raw.reduce((a, b) => a + b, 0);
                    const probs = raw.map(v => total > 0 ? v / total : 0);

                    const maxIdx = probs.indexOf(Math.max(...probs));
                    const confidence = probs[maxIdx] ?? 0;
                    const diseaseKey = CLASS_NAMES[maxIdx] ?? 'unknown';

                    const allScores = CLASS_NAMES.map((label, i) => ({
                        label,
                        score: probs[i] ?? 0,
                    })).sort((a, b) => b.score - a.score);

                    console.log(`[LocalClassifierWeb] ${diseaseKey} ${(confidence * 100).toFixed(1)}%`);

                    resolve({
                        diseaseKey,
                        confidence: Math.round(confidence * 100), // Scale to 0-100%
                        isHighConfidence: confidence >= CONFIDENCE_THRESHOLD,
                        allScores,
                        source: 'local-tflite',
                    });
                } catch (e) {
                    console.warn('[LocalClassifierWeb] Image processing/inference error:', e);
                    resolve(null);
                }
            };
            img.onerror = () => {
                console.warn('[LocalClassifierWeb] Failed to load original image data.');
                resolve(null);
            };

            // Add data:image prefix if missing
            img.src = base64Image.startsWith('data:image') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
        });
    } catch (err) {
        console.warn('[LocalClassifierWeb] Inference error:', err);
        return null;
    }
}
