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

const emptyState = document.getElementById('emptyState');
const canvasWrapper = document.getElementById('canvasWrapper');
const mergeCanvas = document.getElementById('mergeCanvas');
const canvasSizeBadge = document.getElementById('canvasSizeBadge');
const downloadBtn = document.getElementById('downloadBtn');

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

// Xóa tất cả ảnh
clearAllBtn.addEventListener('click', () => {
    imagesList = [];
    fileInput.value = '';
    renderImageList();
    updateStitchedImage();
});

// Nút Tải ảnh ghép
downloadBtn.addEventListener('click', downloadMergedImage);

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
    let loadedCount = 0;
    const filesArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (filesArray.length === 0) return;

    filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                imagesList.push({
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    sizeText: formatFileSize(file.size),
                    img: img
                });
                
                loadedCount++;
                if (loadedCount === filesArray.length) {
                    renderImageList();
                    updateStitchedImage();
                }
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

// Tính toán và ghép ảnh vẽ lên Canvas
function updateStitchedImage() {
    if (imagesList.length === 0) {
        emptyState.style.display = 'flex';
        canvasWrapper.style.display = 'none';
        canvasSizeBadge.textContent = '0 x 0 px';
        downloadBtn.disabled = true;
        return;
    }

    emptyState.style.display = 'none';
    canvasWrapper.style.display = 'flex';
    downloadBtn.disabled = false;

    const ctx = mergeCanvas.getContext('2d');
    const preset = widthPresetSelect.value;
    const spacing = parseInt(spacingSelect.value, 10);
    const showCutLine = showCutLineCheckbox.checked;

    // 1. Xác định chiều rộng canvas (Cw)
    let canvasWidth = 0;
    if (preset === 'auto') {
        // Chiều rộng là chiều rộng của ảnh lớn nhất
        canvasWidth = Math.max(...imagesList.map(item => item.img.naturalWidth));
    } else {
        canvasWidth = parseInt(preset, 10);
    }

    // 2. Tính toán chiều cao từng ảnh khi scale và tổng chiều cao canvas (Ch)
    let totalHeight = 0;
    const scaledHeights = [];

    imagesList.forEach((item, index) => {
        const origW = item.img.naturalWidth || 1;
        const origH = item.img.naturalHeight || 1;
        
        // Tỷ lệ scale chiều cao theo chiều rộng mới
        const scaleFactor = canvasWidth / origW;
        const h = Math.round(origH * scaleFactor);
        
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

    // 4. Vẽ nền trắng (nền giấy in nhiệt)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, totalHeight);

    // 5. Vẽ từng hình ảnh lên Canvas
    let currentY = 0;
    imagesList.forEach((item, index) => {
        const h = scaledHeights[index];
        
        // Vẽ ảnh
        ctx.drawImage(item.img, 0, currentY, canvasWidth, h);
        
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

    // Cập nhật thông số kích thước trên giao diện
    canvasSizeBadge.textContent = `${canvasWidth} x ${totalHeight} px`;
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
