// 文字选择显示插件主脚本, 当用户访问任何网页时，浏览器会自动将 content.js 注入到页面中
// 创建独立作用域, 避免变量污染
(function () {
    'use strict';

    let tooltip = null;
    let hideTimeout = null;

    // 创建提示框元素
    function createTooltip() {
        if (tooltip) {
            tooltip.remove();
        }

        tooltip = document.createElement('div');
        tooltip.className = 'text-selection-tooltip';
        document.body.appendChild(tooltip);

        return tooltip;
    }

    // 显示选中的文字
    function showSelectedText(text, x, y) {
        if (!text || text.trim().length === 0) {
            hideTooltip();
            return;
        }

        const tooltip = createTooltip();

        // 清理文字并限制长度
        const cleanText = text.trim();
        const maxLength = 100;
        const displayText = cleanText.length > maxLength
            ? cleanText.substring(0, maxLength) + '...'
            : cleanText;

        // 设置提示框内容
        tooltip.innerHTML = `
            <div class="selected-text">${escapeHtml(displayText)}</div>
            <div class="text-info">${cleanText.length} 个字符</div>
        `;

        // 计算位置
        const tooltipHeight = 80; // 预估高度
        const tooltipWidth = Math.min(300, displayText.length * 8 + 40);

        let left = x - tooltipWidth / 2;
        let top = y - tooltipHeight - 15; // 在光标上方15px

        // 边界检查
        const padding = 10;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 水平边界检查
        if (left < padding) {
            left = padding;
        } else if (left + tooltipWidth > windowWidth - padding) {
            left = windowWidth - tooltipWidth - padding;
        }

        // 垂直边界检查
        if (top < padding) {
            top = y + 25; // 如果上方空间不够，显示在下方
        }

        // 设置位置
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';

        // 添加显示动画
        requestAnimationFrame(() => {
            tooltip.classList.add('show');
        });

        // 清除之前的隐藏定时器
        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }

        // 4秒后自动隐藏
        hideTimeout = setTimeout(() => {
            hideTooltip();
        }, 4000);
    }

    // 隐藏提示框
    function hideTooltip() {
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (tooltip) {
                    tooltip.remove();
                    tooltip = null;
                }
            }, 200); // 等待动画结束
        }

        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    }

    // HTML转义函数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取鼠标位置
    let lastMouseX = 0;
    let lastMouseY = 0;

    document.addEventListener('mousemove', (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    // 监听文字选择事件
    document.addEventListener('mouseup', (e) => {
        // 延迟获取选择内容，确保选择操作完成
        // 松开鼠标按键时，延迟10ms后检查是否有选中文字
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString();

            if (selectedText && selectedText.trim().length > 0) {
                showSelectedText(selectedText, lastMouseX, lastMouseY);
            } else {
                hideTooltip();
            }
        }, 10);
    });

    // 监听键盘事件，ESC键隐藏提示框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideTooltip();
        }
    });

    // 点击其他区域隐藏提示框
    document.addEventListener('click', (e) => {
        if (tooltip && !tooltip.contains(e.target)) {
            hideTooltip();
        }
    });

    // 滚动时隐藏提示框
    document.addEventListener('scroll', () => {
        hideTooltip();
    });

    // 窗口大小改变时隐藏提示框
    window.addEventListener('resize', () => {
        hideTooltip();
    });

    console.log('划词翻译插件已加载...');
})();
