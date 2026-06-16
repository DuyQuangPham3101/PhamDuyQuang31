// Biến toàn cục lưu trữ danh sách hình ảnh
let imagesList = [];

// DOM Elements
const dragZone = document.getElementById('dragZone');
const fileInput = document.getElementById('fileInput');
const listCard = document.getElementById('listCard');
const imageListContainer = document.getElementById('imageList');
const imageCountSpan = document.getElementById('imageCount');
const clearAllBtn = document.getElementById('clearAllBtn');

const widthPresetSelect = document.getElementById('widthPreset');
const spacingSelect = document.getElementById('spacing');
const showCutLineCheckbox = document.getElementById('showCutLine');
const autoCropCheckbox = document.getElementById('autoCrop');
const cropPaddingSelect = document.getElementById('cropPadding');
const cropPaddingGroup = document.getElementById('cropPaddingGroup');
const monochromeModeCheckbox = document.getElementById('monochromeMode');
const textContrastSelect = document.getElementById('textContrast');
const textContrastGroup = document.getElementById('textContrastGroup');

const emptyState = document.getElementById('emptyState');
const canvasWrapper = document.getElementById('canvasWrapper');
const mergeCanvas = document.getElementById('mergeCanvas');
const canvasSizeBadge = document.getElementById('canvasSizeBadge');
const downloadBtn = document.getElementById('downloadBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

// Biến toàn cục phục vụ in Bluetooth BLE
let bleDevice = null;
let bleServer = null;
let bleCharacteristic = null;
let shouldCancelPrint = false;

// DOM Elements in Bluetooth
const printBleBtn = document.getElementById('printBleBtn');
const printModal = document.getElementById('printModal');
const closePrintModal = document.getElementById('closePrintModal');
const printerTypeSelect = document.getElementById('printerType');
const printDensitySelect = document.getElementById('printDensity');
const paperFeedSelect = document.getElementById('paperFeed');
const startPrintBtn = document.getElementById('startPrintBtn');
const cancelPrintBtn = document.getElementById('cancelPrintBtn');

const printSettingsForm = document.getElementById('printSettingsForm');
const printProgressStatus = document.getElementById('printProgressStatus');
const printStatusTitle = document.getElementById('printStatusTitle');
const printStatusDesc = document.getElementById('printStatusDesc');
const progressBarContainer = document.getElementById('progressBarContainer');
const progressBarFill = document.getElementById('progressBarFill');
const progressPercentage = document.getElementById('progressPercentage');


// Đăng ký các sự kiện kéo thả file
dragZone.addEventListener('click', () => fileInput.click());
dragZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragZone.classList.add('dragover');
});
dragZone.addEventListener('dragleave', () => {
    dragZone.classList.remove('dragover');
});
dragZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

// Sự kiện thay đổi cài đặt
widthPresetSelect.addEventListener('change', updateStitchedImage);
spacingSelect.addEventListener('change', updateStitchedImage);
showCutLineCheckbox.addEventListener('change', updateStitchedImage);
autoCropCheckbox.addEventListener('change', () => {
    toggleCropPaddingVisibility();
    updateStitchedImage();
});
cropPaddingSelect.addEventListener('change', updateStitchedImage);
monochromeModeCheckbox.addEventListener('change', () => {
    toggleMonochromeOptionsVisibility();
    updateStitchedImage();
});
textContrastSelect.addEventListener('change', updateStitchedImage);

function toggleCropPaddingVisibility() {
    if (cropPaddingGroup) {
        cropPaddingGroup.style.display = autoCropCheckbox.checked ? 'flex' : 'none';
    }
}
toggleCropPaddingVisibility();

function toggleMonochromeOptionsVisibility() {
    if (textContrastGroup) {
        textContrastGroup.style.display = monochromeModeCheckbox.checked ? 'flex' : 'none';
    }
}
toggleMonochromeOptionsVisibility();

// Xóa tất cả ảnh
clearAllBtn.addEventListener('click', () => {
    imagesList = [];
    fileInput.value = '';
    renderImageList();
    updateStitchedImage();
});

// Nút Tải ảnh ghép
downloadBtn.addEventListener('click', downloadMergedImage);
downloadPdfBtn.addEventListener('click', downloadMergedPdf);

// Hàm định dạng kích thước tệp tin
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Xử lý các tệp tin được tải lên
function handleFiles(files) {
    const filesArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (filesArray.length === 0) return;

    filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                try {
                    // Tự động phát hiện biên lề hóa đơn
                    const bounds = detectReceiptBounds(img);
                    imagesList.push({
                        id: Date.now() + Math.random().toString(36).substring(2, 11),
                        name: file.name,
                        sizeText: formatFileSize(file.size),
                        img: img,
                        bounds: bounds
                    });
                } catch (err) {
                    console.error("Lỗi khi xử lý cắt lề ảnh:", err);
                    imagesList.push({
                        id: Date.now() + Math.random().toString(36).substring(2, 11),
                        name: file.name,
                        sizeText: formatFileSize(file.size),
                        img: img,
                        bounds: { left: 0, top: 0, right: img.naturalWidth - 1, bottom: img.naturalHeight - 1 }
                    });
                }
                
                // Cập nhật UI ngay lập tức khi mỗi ảnh load xong để không bị nghẽn
                renderImageList();
                updateStitchedImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Render danh sách ảnh quản lý lên giao diện
function renderImageList() {
    if (imagesList.length === 0) {
        listCard.style.display = 'none';
        return;
    }

    listCard.style.display = 'block';
    imageCountSpan.textContent = imagesList.length;
    imageListContainer.innerHTML = '';

    imagesList.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'image-item';
        
        // Trạng thái nút lên xuống
        const isFirst = index === 0;
        const isLast = index === imagesList.length - 1;

        itemEl.innerHTML = `
            <span class="item-index">${index + 1}</span>
            <img class="item-thumb" src="${item.img.src}" alt="${item.name}">
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-size">${item.sizeText}</div>
            </div>
            <div class="item-actions">
                <button class="btn btn-icon" onclick="moveItem(${index}, -1)" ${isFirst ? 'disabled' : ''} title="Di chuyển lên">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button class="btn btn-icon" onclick="moveItem(${index}, 1)" ${isLast ? 'disabled' : ''} title="Di chuyển xuống">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <button class="btn btn-icon btn-danger-icon" onclick="deleteItem(${index})" title="Xóa ảnh">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        imageListContainer.appendChild(itemEl);
    });
}

// Di chuyển thứ tự ảnh trong danh sách
window.moveItem = function(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= imagesList.length) return;
    
    // Swap vị trí
    const temp = imagesList[index];
    imagesList[index] = imagesList[targetIndex];
    imagesList[targetIndex] = temp;
    
    renderImageList();
    updateStitchedImage();
};

// Xóa ảnh khỏi danh sách
window.deleteItem = function(index) {
    imagesList.splice(index, 1);
    renderImageList();
    updateStitchedImage();
};

// Tự động phát hiện biên hóa đơn (khung màu tối ngoài cùng)
function detectReceiptBounds(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    // Nếu ảnh không có kích thước hợp lệ, trả về mặc định
    if (!w || !h) {
        return { left: 0, top: 0, right: 0, bottom: 0 };
    }

    let imgData;
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return { left: 0, top: 0, right: w - 1, bottom: h - 1 };
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0);
        imgData = ctx.getImageData(0, 0, w, h);
        if (!imgData || !imgData.data) {
            return { left: 0, top: 0, right: w - 1, bottom: h - 1 };
        }
    } catch (e) {
        console.error("Không thể đọc dữ liệu ảnh để tự động cắt lề", e);
        return { left: 0, top: 0, right: w - 1, bottom: h - 1 };
    }

    const data = imgData.data;

    function getLuminance(x, y) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < 50) return 255; // Trong suốt coi như màu sáng
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Xác định nền sáng hay tối bằng cách lấy mẫu ở các góc ngoài rìa để thích ứng
    // Lấy mẫu tại 4 điểm cách góc 5% chiều rộng và 15% chiều cao
    const sampleX1 = Math.floor(w * 0.05);
    const sampleX2 = Math.floor(w * 0.95);
    const sampleY1 = Math.floor(h * 0.15);
    const sampleY2 = Math.floor(h * 0.85);

    const l1 = getLuminance(sampleX1, sampleY1);
    const l2 = getLuminance(sampleX2, sampleY1);
    const l3 = getLuminance(sampleX1, sampleY2);
    const l4 = getLuminance(sampleX2, sampleY2);
    
    const avgBackgroundLuminance = (l1 + l2 + l3 + l4) / 4;
    const isDarkBackground = avgBackgroundLuminance < 130;

    const yStart = Math.floor(h * 0.15);
    const yEnd = Math.floor(h * 0.85);
    const scanHeight = yEnd - yStart;

    let left = 0;
    let right = w - 1;
    let top = 0;
    let bottom = h - 1;

    if (isDarkBackground) {
        // --- TRƯỜNG HỢP NỀN TỐI (Quét tìm vùng màu SÁNG của hóa đơn) ---
        // 1. Quét tìm Biên Trái
        const maxScanX = Math.floor(w * 0.45);
        for (let x = 0; x < maxScanX; x++) {
            let lightPixels = 0;
            for (let y = yStart; y <= yEnd; y++) {
                if (getLuminance(x, y) > 160) { // Điểm sáng
                    lightPixels++;
                }
            }
            if (lightPixels / scanHeight > 0.40) {
                left = x;
                break;
            }
        }

        // 2. Quét tìm Biên Phải
        const minScanX = Math.floor(w * 0.55);
        for (let x = w - 1; x >= minScanX; x--) {
            let lightPixels = 0;
            for (let y = yStart; y <= yEnd; y++) {
                if (getLuminance(x, y) > 160) {
                    lightPixels++;
                }
            }
            if (lightPixels / scanHeight > 0.40) {
                right = x;
                break;
            }
        }

        if (left >= right || (right - left) < w * 0.3) {
            left = 0;
            right = w - 1;
        }

        // 3. Quét tìm Biên Trên
        const scanWidth = right - left;
        const xStart = left + Math.floor(scanWidth * 0.05);
        const xEnd = right - Math.floor(scanWidth * 0.05);
        const innerScanWidth = xEnd - xStart;

        const maxScanY = Math.floor(h * 0.5);
        for (let y = 0; y < maxScanY; y++) {
            let lightPixels = 0;
            for (let x = xStart; x <= xEnd; x++) {
                if (getLuminance(x, y) > 160) {
                    lightPixels++;
                }
            }
            if (lightPixels / innerScanWidth > 0.60) {
                top = y;
                break;
            }
        }

        // 4. Quét tìm Biên Dưới
        const minScanY = Math.floor(h * 0.5);
        for (let y = h - 1; y >= minScanY; y--) {
            let lightPixels = 0;
            for (let x = xStart; x <= xEnd; x++) {
                if (getLuminance(x, y) > 160) {
                    lightPixels++;
                }
            }
            if (lightPixels / innerScanWidth > 0.60) {
                bottom = y;
                break;
            }
        }

    } else {
        // --- TRƯỜNG HỢP NỀN SÁNG (Quét tìm đường viền màu TỐI của hóa đơn) ---
        const brightnessThreshold = 130;

        // 1. Quét tìm Biên Trái (Quét biên dọc tối)
        const maxScanX = Math.floor(w * 0.45);
        for (let x = 0; x < maxScanX; x++) {
            let darkPixels = 0;
            for (let y = yStart; y <= yEnd; y++) {
                if (getLuminance(x, y) < brightnessThreshold) {
                    darkPixels++;
                }
            }
            if (darkPixels / scanHeight > 0.40) {
                left = x;
                break;
            }
        }

        // 2. Quét tìm Biên Phải (Quét biên dọc tối)
        const minScanX = Math.floor(w * 0.55);
        for (let x = w - 1; x >= minScanX; x--) {
            let darkPixels = 0;
            for (let y = yStart; y <= yEnd; y++) {
                if (getLuminance(x, y) < brightnessThreshold) {
                    darkPixels++;
                }
            }
            if (darkPixels / scanHeight > 0.40) {
                right = x;
                break;
            }
        }

        if (left >= right || (right - left) < w * 0.3) {
            left = 0;
            right = w - 1;
        }

        // 3. Quét tìm Biên Trên (Quét biên ngang tối)
        // Nhích vào trong biên trái/phải 5% để không bị trùng vào nét vẽ biên dọc.
        const scanWidth = right - left;
        const xStart = left + Math.floor(scanWidth * 0.05);
        const xEnd = right - Math.floor(scanWidth * 0.05);
        const innerScanWidth = xEnd - xStart;

        const maxScanY = Math.floor(h * 0.5);
        for (let y = 0; y < maxScanY; y++) {
            let darkPixels = 0;
            for (let x = xStart; x <= xEnd; x++) {
                if (getLuminance(x, y) < brightnessThreshold) {
                    darkPixels++;
                }
            }
            // Tăng ngưỡng lên 0.70 để chỉ khớp với nét kẻ ngang liền mạch, bỏ qua các dòng chữ thưa thớt
            if (darkPixels / innerScanWidth > 0.70) {
                top = y;
                break;
            }
        }

        // 4. Quét tìm Biên Dưới (Quét biên ngang tối)
        const minScanY = Math.floor(h * 0.5);
        for (let y = h - 1; y >= minScanY; y--) {
            let darkPixels = 0;
            for (let x = xStart; x <= xEnd; x++) {
                if (getLuminance(x, y) < brightnessThreshold) {
                    darkPixels++;
                }
            }
            // Tăng ngưỡng lên 0.70 để chỉ khớp với nét kẻ ngang liền mạch, bỏ qua thanh Home indicator hoặc text thưa thớt
            if (darkPixels / innerScanWidth > 0.70) {
                bottom = y;
                break;
            }
        }
    }

    if (top >= bottom || (bottom - top) < h * 0.3) {
        top = 0;
        bottom = h - 1;
    }

    return { left, top, right, bottom };
}

// Tính toán và ghép ảnh vẽ lên Canvas
function updateStitchedImage() {
    if (imagesList.length === 0) {
        emptyState.style.display = 'flex';
        canvasWrapper.style.display = 'none';
        canvasSizeBadge.textContent = '0 x 0 px';
        downloadBtn.disabled = true;
        downloadPdfBtn.disabled = true;
        if (printBleBtn) printBleBtn.disabled = true;
        return;
    }

    emptyState.style.display = 'none';
    canvasWrapper.style.display = 'flex';
    downloadBtn.disabled = false;
    downloadPdfBtn.disabled = false;
    if (printBleBtn) printBleBtn.disabled = false;

    const ctx = mergeCanvas.getContext('2d');
    const preset = widthPresetSelect.value;
    const spacing = parseInt(spacingSelect.value, 10);
    const showCutLine = showCutLineCheckbox.checked;
    const autoCrop = autoCropCheckbox.checked;
    const padding = parseInt(cropPaddingSelect.value, 10);
    const monochromeMode = monochromeModeCheckbox.checked;

    // 1. Xác định chiều rộng canvas (Cw)
    let canvasWidth = 0;
    if (preset === 'auto') {
        canvasWidth = Math.max(...imagesList.map(item => {
            if (autoCrop && item.bounds) {
                const { left, right } = item.bounds;
                // Thêm padding cho cả 2 phía
                const w = Math.max(1, (right - left) + 2 * padding);
                return Math.min(item.img.naturalWidth, w);
            }
            return item.img.naturalWidth;
        }));
    } else {
        canvasWidth = parseInt(preset, 10);
    }

    // 2. Tính toán chiều cao từng ảnh khi scale và tổng chiều cao canvas (Ch)
    let totalHeight = 0;
    const scaledHeights = [];

    imagesList.forEach((item, index) => {
        let sx = 0, sy = 0;
        let sw = item.img.naturalWidth || 1;
        let sh = item.img.naturalHeight || 1;

        if (autoCrop && item.bounds) {
            let { left, top, right, bottom } = item.bounds;
            // Áp dụng lề thừa padding vào 4 cạnh
            left = Math.max(0, left - padding);
            top = Math.max(0, top - padding);
            right = Math.min(item.img.naturalWidth - 1, right + padding);
            bottom = Math.min(item.img.naturalHeight - 1, bottom + padding);

            sx = left;
            sy = top;
            sw = Math.max(1, right - left);
            sh = Math.max(1, bottom - top);
        }

        // Tỷ lệ scale chiều cao theo chiều rộng mới
        const scaleFactor = canvasWidth / sw;
        const h = Math.max(1, Math.round(sh * scaleFactor));
        
        item._drawRect = { sx, sy, sw, sh, h };
        
        scaledHeights.push(h);
        totalHeight += h;
        
        // Cộng thêm khoảng cách nếu không phải ảnh cuối
        if (index < imagesList.length - 1) {
            totalHeight += spacing;
        }
    });

    // 3. Khởi tạo kích thước Canvas
    mergeCanvas.width = canvasWidth;
    mergeCanvas.height = totalHeight;

    // Thiết lập chất lượng vẽ ảnh cao nhất để không bị mờ chữ khi scale down
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 4. Vẽ nền trắng (nền giấy in nhiệt)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, totalHeight);

    // 5. Vẽ từng hình ảnh lên Canvas
    let currentY = 0;
    imagesList.forEach((item, index) => {
        const { sx, sy, sw, sh, h } = item._drawRect;
        
        // Vẽ ảnh
        ctx.drawImage(item.img, sx, sy, sw, sh, 0, currentY, canvasWidth, h);
        
        currentY += h;

        // Vẽ đường cắt nét đứt nếu được bật và không phải ảnh cuối cùng
        if (index < imagesList.length - 1) {
            if (showCutLine && spacing > 0) {
                const lineY = currentY + (spacing / 2);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(0, lineY);
                ctx.lineTo(canvasWidth, lineY);
                ctx.stroke();
                ctx.setLineDash([]); // Reset nét đứt
            }
            currentY += spacing;
        }
    });

    // 6. Tối ưu đơn sắc (Monochrome Binarization) nếu bật
    if (monochromeMode) {
        try {
            const contrastThreshold = parseInt(textContrastSelect.value, 10) || 180;
            const canvasData = ctx.getImageData(0, 0, canvasWidth, totalHeight);
            const pixels = canvasData.data;
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                if (a < 50) {
                    // Trong suốt đưa về trắng hoàn toàn
                    pixels[i] = 255;
                    pixels[i + 1] = 255;
                    pixels[i + 2] = 255;
                    pixels[i + 3] = 255;
                } else {
                    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                    // Sử dụng ngưỡng động từ cấu hình để đưa nét chữ xám/mờ về đen đậm
                    const val = luminance < contrastThreshold ? 0 : 255;
                    pixels[i] = val;
                    pixels[i + 1] = val;
                    pixels[i + 2] = val;
                    pixels[i + 3] = 255;
                }
            }
            ctx.putImageData(canvasData, 0, 0);
        } catch (e) {
            console.error("Lỗi khi tối ưu hóa đơn sắc:", e);
        }
    }

    // Cập nhật thông số kích thước trên giao diện
    canvasSizeBadge.textContent = `${canvasWidth} x ${totalHeight} px`;

    // Cảnh báo nếu chiều cao quá lớn có thể gây mờ hoặc giảm chất lượng in
    if (totalHeight > 8000) {
        canvasSizeBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        canvasSizeBadge.style.color = '#ef4444';
        canvasSizeBadge.title = "Chiều cao ảnh lớn có thể làm giảm chất lượng in. Hãy chia làm ít ảnh hơn nếu bị mờ.";
    } else {
        canvasSizeBadge.style.backgroundColor = 'rgba(79, 70, 229, 0.15)';
        canvasSizeBadge.style.color = 'var(--primary-color)';
        canvasSizeBadge.title = "";
    }
}

// Tải xuống ảnh kết quả dưới dạng PNG
function downloadMergedImage() {
    if (imagesList.length === 0) return;

    // Tạo tên file ngẫu nhiên theo mốc thời gian
    const now = new Date();
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
    
    const fileName = `don_hang_ghep_${timestamp}.png`;
    
    // Tạo link ảo để download
    const link = document.createElement('a');
    link.download = fileName;
    link.href = mergeCanvas.toDataURL('image/png');
    link.click();
}

// Tải xuống file PDF kết quả
function downloadMergedPdf() {
    if (imagesList.length === 0) return;

    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("Thư viện xuất PDF chưa được tải xong. Vui lòng thử lại sau giây lát.");
            return;
        }

        // Xác định khổ in vật lý (58mm hoặc 80mm) dựa trên chiều rộng canvas
        const pdfWidth = (mergeCanvas.width >= 576) ? 80 : 58;
        const pdfHeight = pdfWidth * (mergeCanvas.height / mergeCanvas.width);

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        // Xuất ảnh từ Canvas ở dạng PNG chất lượng cao
        const imgData = mergeCanvas.toDataURL('image/png');
        
        // Vẽ ảnh phủ kín toàn bộ trang PDF
        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        // Tạo tên file ngẫu nhiên theo mốc thời gian
        const now = new Date();
        const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        const fileName = `don_hang_ghep_${timestamp}.pdf`;
        
        // Tạo file Blob từ tài liệu PDF
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        
        // Tạo thẻ a ẩn để kích hoạt trình tải xuống của hệ điều hành di động (iOS/Android)
        // Điều này buộc Safari/Chrome hiển thị hộp thoại tải về thực tế thay vì mở xem trước trực tiếp trên tab
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Giải phóng URL bộ nhớ sau khi tải xong
        setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 100);
    } catch (e) {
        console.error("Lỗi khi tạo file PDF:", e);
        alert("Có lỗi xảy ra khi tạo file PDF: " + e.message);
    }
}

// ==========================================
// TRÌNH ĐIỀU KHIỂN IN ẢNH QUA BLUETOOTH (BLE)
// ==========================================

// Đăng ký sự kiện mở Modal In ấn
if (printBleBtn) {
    printBleBtn.addEventListener('click', () => {
        if (printModal) {
            printModal.style.display = 'flex';
            // Reset giao diện Modal về trạng thái cấu hình
            if (printSettingsForm) printSettingsForm.style.display = 'block';
            if (printProgressStatus) printProgressStatus.style.display = 'none';
        }
        shouldCancelPrint = false;
    });
}

// Đăng ký sự kiện đóng Modal In ấn
if (closePrintModal) {
    closePrintModal.addEventListener('click', () => {
        if (printModal) printModal.style.display = 'none';
        disconnectBle();
    });
}

// Đóng modal khi bấm ra ngoài vùng nội dung modal
window.addEventListener('click', (e) => {
    if (e.target === printModal) {
        printModal.style.display = 'none';
        disconnectBle();
    }
});

// Nút hủy in ấn
if (cancelPrintBtn) {
    cancelPrintBtn.addEventListener('click', () => {
        shouldCancelPrint = true;
        updatePrintStatus("Đang dừng...", "Đang dừng truyền dữ liệu in theo yêu cầu.");
    });
}

// Cập nhật trạng thái in ấn trên modal
function updatePrintStatus(title, desc, percent = null) {
    if (printStatusTitle) printStatusTitle.textContent = title;
    if (printStatusDesc) printStatusDesc.textContent = desc;
    
    if (progressBarContainer && progressPercentage && progressBarFill) {
        if (percent !== null) {
            progressBarContainer.style.display = 'block';
            progressPercentage.style.display = 'block';
            progressBarFill.style.width = `${percent}%`;
            progressPercentage.textContent = `${percent}%`;
        } else {
            progressBarContainer.style.display = 'none';
            progressPercentage.style.display = 'none';
        }
    }
}

// Ngắt kết nối thiết bị BLE và dọn dẹp các biến liên quan
async function disconnectBle() {
    shouldCancelPrint = true;
    if (bleServer && bleServer.connected) {
        try {
            await bleServer.disconnect();
            console.log("Đã ngắt kết nối BLE chủ động.");
        } catch (e) {
            console.error("Lỗi khi ngắt kết nối BLE:", e);
        }
    }
    bleDevice = null;
    bleServer = null;
    bleCharacteristic = null;
}

// Lắng nghe sự kiện ngắt kết nối không chủ ý từ thiết bị
function onDisconnected() {
    console.log("Thiết bị BLE đã ngắt kết nối.");
    if (!shouldCancelPrint && printProgressStatus && printProgressStatus.style.display === 'block') {
        updatePrintStatus("Mất kết nối", "Kết nối với máy in bị ngắt đột ngột.");
        setTimeout(() => {
            if (printSettingsForm) printSettingsForm.style.display = 'block';
            if (printProgressStatus) printProgressStatus.style.display = 'none';
        }, 3000);
    }
}

// Hàm khởi tạo và bắt đầu quá trình in ấn Bluetooth
async function startBluetoothPrint() {
    shouldCancelPrint = false;
    
    if (printSettingsForm && printProgressStatus) {
        printSettingsForm.style.display = 'none';
        printProgressStatus.style.display = 'block';
    }
    
    updatePrintStatus("Đang chuẩn bị...", "Đang khởi động tiến trình in hóa đơn.");

    try {
        if (!mergeCanvas) {
            throw new Error("Không tìm thấy dữ liệu ảnh hóa đơn cần in.");
        }

        const printerType = printerTypeSelect ? printerTypeSelect.value : 'cat';
        const feedMm = paperFeedSelect ? (parseInt(paperFeedSelect.value, 10) || 0) : 20;

        // 1. Xác định chiều rộng in vật lý của máy
        let targetWidth = 384; // Khổ 58mm tiêu chuẩn
        const preset = widthPresetSelect ? widthPresetSelect.value : '384';
        if (printerType === 'escpos') {
            if (preset.includes('80mm') || preset.includes('576') || preset.includes('1152')) {
                targetWidth = 576; // Khổ 80mm tiêu chuẩn
            }
        }

        // Giới hạn chiều cao tối đa 1200px để giảm số dòng in, tăng tốc độ
        const MAX_PRINT_HEIGHT = 1200;
        let targetHeight = Math.round(mergeCanvas.height * (targetWidth / mergeCanvas.width));
        let finalWidth = targetWidth;
        if (targetHeight > MAX_PRINT_HEIGHT) {
            const scaleDown = MAX_PRINT_HEIGHT / targetHeight;
            finalWidth = Math.round(targetWidth * scaleDown);
            // Làm tròn về bội số của 8 (yêu cầu của Cat Printer)
            finalWidth = Math.floor(finalWidth / 8) * 8;
            targetHeight = MAX_PRINT_HEIGHT;
        }
        // Cập nhật targetWidth theo chiều rộng đã scale
        const actualWidth = finalWidth || targetWidth;
        
        updatePrintStatus("Đang xử lý ảnh...", `Đang chuyển đổi kích thước hóa đơn sang khổ ${actualWidth}x${targetHeight}px.`);

        // 2. Chuyển đổi và nhị phân hóa (Binarization) ảnh hóa đơn
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = actualWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(mergeCanvas, 0, 0, actualWidth, targetHeight);
        
        const imgData = tempCtx.getImageData(0, 0, actualWidth, targetHeight);
        const pixels = imgData.data;
        const binarized = new Uint8Array(actualWidth * targetHeight);
        const contrastThreshold = textContrastSelect ? (parseInt(textContrastSelect.value, 10) || 180) : 180;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            let isBlack = false;
            if (a < 50) {
                isBlack = false;
            } else {
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                isBlack = luminance < contrastThreshold;
            }
            binarized[i / 4] = isBlack ? 1 : 0;
        }

        // 3. Yêu cầu kết nối thiết bị Bluetooth qua Web Bluetooth API
        updatePrintStatus("Đang quét máy in...", "Hãy chọn máy in của bạn từ hộp thoại kết nối của hệ thống.");
        
        const optionalServices = [
            '0000ae30-0000-1000-8000-00805f9b34fb', // Cat Printer (AE30)
            '000018f0-0000-1000-8000-00805f9b34fb', // ESC/POS BLE chuẩn (18F0)
            '49535343-fe7d-4158-b696-f2b8b939629b', // Dịch vụ ISSC phổ biến
            'e7e1a000-4f7b-11e1-b136-0050c2490048', // Dịch vụ Serial Custom
            '0000ff00-0000-1000-8000-00805f9b34fb'  // Generic Print FF00
        ];

        bleDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: optionalServices
        });

        if (shouldCancelPrint) return;

        updatePrintStatus("Đang kết nối...", `Đang kết nối tới ${bleDevice.name || 'máy in'}...`);
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        bleServer = await bleDevice.gatt.connect();

        if (shouldCancelPrint) return;
        updatePrintStatus("Đang tìm cổng in...", "Đang tìm dịch vụ truyền dữ liệu trên máy in.");

        // Tìm Primary Service phù hợp
        let service = null;
        let serviceUuid = '';
        if (printerType === 'cat') {
            serviceUuid = '0000ae30-0000-1000-8000-00805f9b34fb';
            try {
                service = await bleServer.getPrimaryService(serviceUuid);
            } catch (e) {
                console.warn("Không thể lấy dịch vụ Cat chuẩn, chuyển sang quét động...");
            }
        }

        if (!service) {
            for (const uuid of optionalServices) {
                try {
                    service = await bleServer.getPrimaryService(uuid);
                    if (service) {
                        serviceUuid = uuid;
                        break;
                    }
                } catch (e) {
                    // Tiếp tục quét các UUID khác
                }
            }
        }

        if (!service) {
            throw new Error("Không thể tìm thấy dịch vụ in tương thích trên máy in này.");
        }

        // Tìm Characteristic ghi dữ liệu in
        let writeChar = null;
        if (printerType === 'cat' && serviceUuid === '0000ae30-0000-1000-8000-00805f9b34fb') {
            try {
                writeChar = await service.getCharacteristic('0000ae01-0000-1000-8000-00805f9b34fb');
            } catch (e) {
                console.warn("Không tìm thấy characteristic Cat chuẩn, chuyển sang quét động...");
            }
        }

        if (!writeChar) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                    writeChar = char;
                    break;
                }
            }
        }

        if (!writeChar) {
            throw new Error("Không tìm thấy Characteristic ghi dữ liệu của máy in.");
        }

        bleCharacteristic = writeChar;

        // 4. Bắt đầu truyền dữ liệu in tùy theo loại máy in được chọn
        updatePrintStatus("Đang truyền dữ liệu...", "Đang thiết lập thông số in ban đầu.", 0);

        if (printerType === 'cat') {
            await printToCatPrinter(bleCharacteristic, binarized, actualWidth, targetHeight, feedMm);
        } else {
            await printToEscposPrinter(bleCharacteristic, binarized, actualWidth, targetHeight, feedMm);
        }

        // 5. Hoàn thành tiến trình in
        updatePrintStatus("In thành công!", "Dữ liệu đã truyền xong, đang hoàn tất...", 100);
        setTimeout(() => {
            if (printModal) printModal.style.display = 'none';
            disconnectBle();
        }, 1500);

    } catch (err) {
        console.error("Lỗi trong quá trình in BLE:", err);
        if (err.name === 'NotFoundError' || err.message.includes('User cancelled')) {
            updatePrintStatus("Đã hủy in", "Người dùng hủy chọn thiết bị hoặc không tìm thấy thiết bị.");
        } else {
            updatePrintStatus("Lỗi kết nối / In", err.message || "Đã xảy ra lỗi không xác định.");
        }
        setTimeout(() => {
            if (printSettingsForm) printSettingsForm.style.display = 'block';
            if (printProgressStatus) printProgressStatus.style.display = 'none';
        }, 3000);
    }
}

// Logic in cho dòng máy Cat Printer / Fun Print (giao thức 0x5178)
async function printToCatPrinter(characteristic, binarized, width, height, feedMm) {
    // A. Gửi độ đậm nhạt (Energy)
    const densityVal = printDensitySelect ? printDensitySelect.value : 'high';
    let energyByte = 0x33; // Vừa (mặc định)
    let energyCRC = 0x99;
    if (densityVal === 'low') {
        energyByte = 0x32;
        energyCRC = 0x9E;
    } else if (densityVal === 'high') {
        energyByte = 0x35;
        energyCRC = 0x8B;
    }
    const energyPacket = new Uint8Array([0x51, 0x78, 0xA4, 0x00, 0x01, 0x00, energyByte, energyCRC, 0xFF]);
    await writePacket(characteristic, energyPacket, 40);

    // B. Gửi lệnh bắt đầu in latticeStart
    const latticeStart = new Uint8Array([0x51, 0x78, 0xA6, 0, 0x0B, 0, 0xAA, 0x55, 0x17, 0x38, 0x44, 0x5F, 0x5F, 0x5F, 0x44, 0x38, 0x2C, 0xA1, 0xFF]);
    await writePacket(characteristic, latticeStart, 40);

    // C. Truyền từng dòng ảnh binarized (Cat Printer yêu cầu 1 dòng/gói)
    const bytesPerLine = width / 8; // 48 bytes cho w=384
    const rowBytes = new Uint8Array(bytesPerLine);

    for (let y = 0; y < height; y++) {
        if (shouldCancelPrint) throw new Error("Hủy in bởi người dùng");

        // Đóng gói 8 điểm ảnh thành 1 byte (LSB-first đối với dòng máy Cat)
        for (let x = 0; x < bytesPerLine; x++) {
            let b = 0;
            for (let bit = 0; bit < 8; bit++) {
                const pixelVal = binarized[y * width + x * 8 + bit];
                if (pixelVal === 1) {
                    b |= (1 << bit);
                }
            }
            rowBytes[x] = b;
        }

        // Tạo gói tin dòng dữ liệu CMD = 0xA2
        const linePacket = new Uint8Array(2 + 4 + bytesPerLine + 1 + 1);
        linePacket[0] = 0x51;
        linePacket[1] = 0x78;
        linePacket[2] = 0xA2;
        linePacket[3] = 0x00;
        linePacket[4] = bytesPerLine & 0xff;
        linePacket[5] = (bytesPerLine >> 8) & 0xff;
        linePacket.set(rowBytes, 6);
        linePacket[6 + bytesPerLine] = calculateCRC8(0xA2, rowBytes);
        linePacket[6 + bytesPerLine + 1] = 0xFF;

        // Giảm delay xuống 10ms/dòng (Cat Printer chịu được, nhanh hơn 2.5x so với 25ms)
        await writePacket(characteristic, linePacket, 10);

        const percent = Math.round(((y + 1) / height) * 90);
        if (y % 20 === 0) { // Cập nhật UI mỗi 20 dòng để không lag
            updatePrintStatus("Đang in hóa đơn...", `Đang truyền dòng ${y + 1}/${height}...`, percent);
        }
    }

    // D. Gửi lệnh kết thúc in latticeEnd
    const latticeEnd = new Uint8Array([0x51, 0x78, 0xA6, 0, 0x0B, 0, 0xAA, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17, 0x11, 0xFF]);
    await writePacket(characteristic, latticeEnd, 40);

    // E. Lệnh đẩy giấy ra lề cắt
    if (feedMm > 0) {
        updatePrintStatus("Đang đẩy giấy...", "Đang kéo giấy ra lề cắt.", 95);
        const steps = feedMm * 8;
        const feedBytes = new Uint8Array([steps & 0xff, (steps >> 8) & 0xff]);
        const feedCRC = calculateCRC8(0xA1, feedBytes);
        const feedPacket = new Uint8Array([0x51, 0x78, 0xA1, 0x00, 0x02, 0x00, feedBytes[0], feedBytes[1], feedCRC, 0xFF]);
        await writePacket(characteristic, feedPacket, 150);
    }
}

// Logic in cho dòng máy in hóa đơn chuẩn ESC/POS
async function printToEscposPrinter(characteristic, binarized, width, height, feedMm) {
    // A. Khởi tạo máy in (ESC @) và tắt giãn cách dòng (ESC 3 0)
    const initCmd = new Uint8Array([0x1B, 0x40, 0x1B, 0x33, 0x00]);
    await writeDataInChunks(characteristic, initCmd, 10);

    // B. In ảnh theo từng khối nhỏ (chunk) 40 dòng tránh tràn RAM/RAM đệm máy in
    const chunkHeight = 40;
    const bytesPerRow = width / 8; // 48 bytes (58mm) hoặc 72 bytes (80mm)
    
    for (let chunkY = 0; chunkY < height; chunkY += chunkHeight) {
        if (shouldCancelPrint) throw new Error("Hủy in bởi người dùng");

        const currentChunkHeight = Math.min(chunkHeight, height - chunkY);
        const chunkBuffer = new Uint8Array(8 + bytesPerRow * currentChunkHeight);
        
        // Cấu trúc lệnh ESC/POS GS v 0
        chunkBuffer[0] = 0x1D; // GS
        chunkBuffer[1] = 0x76; // v
        chunkBuffer[2] = 0x30; // 0
        chunkBuffer[3] = 0x00; // m = 0
        chunkBuffer[4] = bytesPerRow & 0xff; // xL
        chunkBuffer[5] = (bytesPerRow >> 8) & 0xff; // xH
        chunkBuffer[6] = currentChunkHeight & 0xff; // yL
        chunkBuffer[7] = (currentChunkHeight >> 8) & 0xff; // yH
        
        let offset = 8;
        for (let cy = 0; cy < currentChunkHeight; cy++) {
            const y = chunkY + cy;
            for (let x = 0; x < bytesPerRow; x++) {
                let b = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const pixelVal = binarized[y * width + x * 8 + bit];
                    if (pixelVal === 1) { // 1 là điểm đen
                        b |= (1 << (7 - bit)); // MSB-first đối với máy ESC/POS
                    }
                }
                chunkBuffer[offset++] = b;
            }
        }

        // Gửi chunk dữ liệu
        await writeDataInChunks(characteristic, chunkBuffer, 10);

        // Đợi 50ms cho mô-tơ máy chạy kịp và tránh lỗi truyền
        await new Promise(resolve => setTimeout(resolve, 50));

        const printedLines = Math.min(chunkY + chunkHeight, height);
        const percent = Math.round((printedLines / height) * 90);
        updatePrintStatus("Đang in hóa đơn...", `Đang truyền dòng ${printedLines}/${height}...`, percent);
    }

    // C. Trả giãn cách dòng về mặc định (ESC 2)
    const resetCmd = new Uint8Array([0x1B, 0x32]);
    await writeDataInChunks(characteristic, resetCmd, 10);

    // D. Đẩy giấy (ESC J)
    if (feedMm > 0) {
        updatePrintStatus("Đang đẩy giấy...", "Đang kéo giấy ra lề cắt.", 95);
        let steps = feedMm * 8;
        while (steps > 0) {
            const feedSteps = Math.min(steps, 255);
            // ESC J feedSteps
            await writeDataInChunks(characteristic, new Uint8Array([0x1B, 0x4A, feedSteps]), 15);
            steps -= feedSteps;
        }
    }
}

// Tính toán mã CRC8 với polynomial 0x07 (X8 + X2 + X + 1)
function calculateCRC8(cmd, data) {
    const payload = new Uint8Array(4 + data.length);
    payload[0] = cmd;
    payload[1] = 0x00;
    payload[2] = data.length & 0xff;
    payload[3] = (data.length >> 8) & 0xff;
    payload.set(data, 4);
    
    let crc = 0x00;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload[i];
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x80) !== 0) {
                crc = ((crc << 1) ^ 0x07) & 0xff;
            } else {
                crc = (crc << 1) & 0xff;
            }
        }
    }
    return crc;
}

// Bổ trợ: Ghi gói dữ liệu đơn lẻ qua BLE
async function writePacket(characteristic, packet, delayMs = 25) {
    if (shouldCancelPrint) throw new Error("Hủy in bởi người dùng");
    
    if (characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(packet);
    } else {
        await characteristic.writeValue(packet);
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
}

// Bổ trợ: Ghi mảng byte lớn bẻ nhỏ thành từng block 20 bytes để tránh lỗi MTU của BLE
async function writeDataInChunks(characteristic, data, delayMs = 15) {
    const chunkSize = 182; // Tăng MTU chunk để giảm số lần write BLE
    for (let i = 0; i < data.length; i += chunkSize) {
        if (shouldCancelPrint) throw new Error("Hủy in bởi người dùng");
        
        const chunk = data.slice(i, i + chunkSize);
        if (characteristic.writeValueWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
        } else {
            await characteristic.writeValue(chunk);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}

// Gắn sự kiện kết nối & in cho nút trong Modal
if (startPrintBtn) {
    startPrintBtn.addEventListener('click', startBluetoothPrint);
}

