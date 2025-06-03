<template>
    <div class="drawing-container">
        <h1>Vẽ Chữ Hán</h1>

        <canvas ref="drawingCanvas" width="900" height="360" class="drawing-canvas" @mousedown="startDrawing"
            @mousemove="draw" @mouseup="endDrawingAndRecognize" @mouseout="endDrawingAndRecognize"></canvas>

        <div class="controls">
            <div class="control-group">
                <label>Chiều cao:</label>
                <input type="range" v-model="targetHeight" min="30" max="60" step="1" class="slider" />
                <span>{{ targetHeight }}px</span>
            </div>

            <div class="buttons">
                <button @click="clearCanvas" class="button secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Xóa
                </button>

                <button @click="manualRecognize" :disabled="!hasDrawn || isProcessing" class="button accent">
                    <span v-if="isProcessing" class="loading-spinner"></span>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {{ isProcessing ? 'Đang xử lý...' : 'Nhận dạng' }}
                </button>

                <a v-if="downloadURL" :href="downloadURL" download="chinese_character.png" class="button link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Tải xuống
                </a>
            </div>
        </div>

        <transition name="fade">
            <div v-if="debugInfo" class="info-box debug">
                <pre>{{ debugInfo }}</pre>
            </div>
        </transition>

        <transition name="fade">
            <div v-if="ocrResult" class="info-box success">
                <h3>Kết quả nhận dạng</h3>
                <div class="result-content">
                    <div class="result-character">{{ ocrResult.text }}</div>
                    <div class="result-score">Độ chính xác: {{ (ocrResult.score * 100).toFixed(1) }}%</div>
                </div>
            </div>
        </transition>

        <transition name="fade">
            <div v-if="ocrError" class="info-box error">
                <h3>Lỗi</h3>
                <div v-html="formatErrorMessage(ocrError)"></div>
            </div>
        </transition>
    </div>
</template>

<script>
export default {
    data() {
        return {
            isDrawing: false,
            startX: 0,
            startY: 0,
            hasDrawn: false,
            downloadURL: null,
            targetHeight: 48,
            ocrResult: null,
            ocrError: null,
            isProcessing: false,
            debugInfo: null,
            recognizeTimeout: null,
            lastStrokeTime: 0,
            isDrawingPaused: false,
            drawingPauseTimeout: null
        };
    },

    mounted() {
        this.initCanvas();
    },

    methods: {
        initCanvas() {
            this.ctx = this.$refs.drawingCanvas.getContext('2d');
            this.ctx.lineWidth = 14;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = '#000';
            this.clearCanvas();
        },

        startDrawing(event) {
            this.isDrawing = true;
            this.startX = event.offsetX;
            this.startY = event.offsetY;
            this.hasDrawn = true;
            this.lastStrokeTime = Date.now();
        },

        draw(event) {
            if (!this.isDrawing) return;

            const x = event.offsetX;
            const y = event.offsetY;

            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();

            this.startX = x;
            this.startY = y;
            
            this.lastStrokeTime = Date.now();
            
            this.isDrawingPaused = false;
            
            if (this.drawingPauseTimeout) {
                clearTimeout(this.drawingPauseTimeout);
            }
            
            this.drawingPauseTimeout = setTimeout(() => {
                if (!this.isDrawingPaused) {
                    this.isDrawingPaused = true;
                    this.convertToImage();
                    this.recognizeText();
                }
            }, 300);
        },

        endDrawingAndRecognize() {
            if (!this.isDrawing) return;
            
            this.isDrawing = false;
            
            this.convertToImage();
            
            this.recognizeText();
        },

        clearCanvas() {
            const canvas = this.$refs.drawingCanvas;
            this.ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.downloadURL = null;
            this.hasDrawn = false;
            this.ocrResult = null;
            this.ocrError = null;
            this.debugInfo = null;
        },

        convertToImage() {
            const canvas = this.$refs.drawingCanvas;

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            const originalWidth = canvas.width;
            const originalHeight = canvas.height;
            const targetWidth = Math.floor(originalWidth * (this.targetHeight / originalHeight));

            tempCanvas.width = targetWidth;
            tempCanvas.height = this.targetHeight;

            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, targetWidth, this.targetHeight);
            tempCtx.drawImage(canvas, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, this.targetHeight);

            this.downloadURL = tempCanvas.toDataURL('image/png');
            this.debugInfo = `Kích thước gốc: ${originalWidth}x${originalHeight}px → Sau khi resize: ${targetWidth}x${this.targetHeight}px`;
        },

        manualRecognize() {
            if (!this.hasDrawn || this.isProcessing) return;
            this.convertToImage();
            this.recognizeText();
        },

        async recognizeText() {
            if (!this.downloadURL || this.isProcessing) return;

            if (this.recognizeTimeout) {
                clearTimeout(this.recognizeTimeout);
            }

            this.isProcessing = true;
            this.ocrResult = null;
            this.ocrError = null;

            try {
                const response = await fetch(this.downloadURL);
                const blob = await response.blob();

                const formData = new FormData();
                formData.append('image', blob, 'chinese_character.png');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const apiUrl = process.env.API_URL_BASE
                    ? `${process.env.API_URL_BASE}/api/ocr` 
                    : '/api/ocr';

                const ocrResponse = await fetch(apiUrl, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                
                if (!ocrResponse.ok) {
                    throw new Error(`HTTP error! Status: ${ocrResponse.status}`);
                }

                const data = await ocrResponse.json();
                if (data.status === 'success' && data.data && data.data.length > 0) {
                    const newResult = {
                        text: data.data[0].text,
                        score: data.data[0].confidence
                    };
                    
                    if (!this.ocrResult || newResult.score > this.ocrResult.score) {
                        this.ocrResult = newResult;
                    }
                } else {
                    this.ocrError = 'Không nhận dạng được chữ trong ảnh.';
                }
            } catch (error) {
                console.error('OCR error:', error);

                if (error.name === 'AbortError') {
                    this.ocrError = 'Yêu cầu bị hủy do quá thời gian timeout.';
                } else if (error.message.includes('404')) {
                    this.ocrError = 'API không tồn tại hoặc proxy không chuyển tiếp đúng. Vui lòng kiểm tra server OCR.';
                } else {
                    this.ocrError = `Lỗi: ${error.message}`;
                }
            } finally {
                this.isProcessing = false;
            }
        },

        formatErrorMessage(error) {
            return error.replace(/\n/g, '<br>');
        }
    }
};
</script>

<style scoped>
.drawing-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 940px;
    margin: 0 auto;
    padding: 20px;
    background: linear-gradient(145deg, #f6f7f9, #e6e9f0);
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

h1 {
    font-size: 1.8rem;
    margin-bottom: 20px;
    color: #2c3e50;
    font-weight: 600;
    position: relative;
}

h1::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 50px;
    height: 3px;
    background-color: #6f42c1;
    border-radius: 2px;
}

.drawing-canvas {
    border: 2px solid #d1d5db;
    border-radius: 8px;
    cursor: crosshair;
    background-color: #fff;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
}

/* Controls */
.controls {
    width: 100%;
    margin-bottom: 20px;
}

.control-group {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    background-color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.control-group label {
    font-weight: 500;
    color: #4a5568;
    min-width: 90px;
}

.slider {
    flex: 1;
    appearance: none;
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    outline: none;
}

.slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: #6f42c1;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
}

.slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
}

.slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #6f42c1;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
}

.slider::-moz-range-thumb:hover {
    transform: scale(1.2);
}

.buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
}

/* Buttons */
.button {
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 120px;
    transition: all 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.button:active {
    transform: translateY(0);
}

.button:disabled {
    background-color: #e2e8f0;
    color: #a0aec0;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

.button.primary {
    background: linear-gradient(135deg, #4299e1, #3182ce);
    color: white;
}

.button.secondary {
    background: linear-gradient(135deg, #718096, #4a5568);
    color: white;
}

.button.accent {
    background: linear-gradient(135deg, #805ad5, #6f42c1);
    color: white;
}

.button.link {
    background: linear-gradient(135deg, #48bb78, #38a169);
    color: white;
    text-decoration: none;
    text-align: center;
}

/* Info boxes */
.info-box {
    width: 100%;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    text-align: left;
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    transition: all 0.3s;
}

.info-box:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.info-box.debug {
    border-left: 4px solid #ed8936;
}

.info-box.success {
    border-left: 4px solid #38b2ac;
}

.info-box.error {
    border-left: 4px solid #e53e3e;
}

.info-box h3 {
    margin-top: 0;
    margin-bottom: 12px;
    color: #2d3748;
    font-size: 16px;
}

.info-box pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 13px;
    background-color: #f7fafc;
    padding: 10px;
    border-radius: 4px;
}

/* Spinner */
.loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Responsive design */
@media (max-width: 600px) {
    .button {
        flex: 1 0 calc(50% - 12px);
        min-width: 0;
    }

    .drawing-container {
        padding: 16px;
        border-radius: 8px;
    }

    h1 {
        font-size: 1.5rem;
    }
}

/* Thêm style cho hiệu ứng transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

/* Style cho kết quả nhận dạng */
.result-content {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.result-character {
    font-size: 48px;
    font-weight: 600;
    margin-bottom: 8px;
    background-color: #f7fafc;
    padding: 16px 32px;
    border-radius: 8px;
    min-width: 80px;
    text-align: center;
}

.result-score {
    font-size: 14px;
    color: #4a5568;
}
</style>