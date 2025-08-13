// 简化版本的文字选择显示插件
(() => {
    'use strict';

    // 全局变量
    let tooltip: HTMLDivElement | null = null;
    let hideTimer: number | null = null;
    let mouseX = 0;
    let mouseY = 0;

    // 配置常量
    const CONFIG = {
        MAX_TEXT_LENGTH: 100,
        HIDE_DELAY: 4000,
        ANIMATION_DELAY: 200,
        TOOLTIP_OFFSET: 15
    };

    /**
     * 创建提示框
     */
    function createTooltip(): HTMLDivElement {
        if (tooltip) {
            tooltip.remove();
        }

        tooltip = document.createElement('div');
        tooltip.className = 'text-selection-tooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    /**
     * 显示选中文字
     */
    function showTooltip(text: string): void {
        if (!text?.trim()) {
            hideTooltip();
            return;
        }

        const element = createTooltip();
        const cleanText = text.trim();
        const displayText = cleanText.length > CONFIG.MAX_TEXT_LENGTH
            ? cleanText.substring(0, CONFIG.MAX_TEXT_LENGTH) + '...'
            : cleanText;

        // 设置内容
        element.innerHTML = `
            <div class="selected-text">${escapeHtml(displayText)}</div>
            <div class="text-info">${cleanText.length} 个字符</div>
        `;

        // 设置位置
        setTooltipPosition(element);

        // 显示动画
        requestAnimationFrame(() => element.classList.add('show'));

        // 自动隐藏
        clearTimer();
        hideTimer = window.setTimeout(hideTooltip, CONFIG.HIDE_DELAY);
    }

    /**
     * 隐藏提示框
     */
    function hideTooltip(): void {
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => {
                tooltip?.remove();
                tooltip = null;
            }, CONFIG.ANIMATION_DELAY);
        }
        clearTimer();
    }

    /**
     * 设置提示框位置
     */
    function setTooltipPosition(element: HTMLDivElement): void {
        const width = Math.min(300, element.textContent!.length * 8 + 40);
        let left = mouseX - width / 2;
        let top = mouseY - 80 - CONFIG.TOOLTIP_OFFSET;

        // 边界检查
        const padding = 10;
        left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
        top = top < padding ? mouseY + 25 : top;

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
    }

    /**
     * HTML转义
     */
    function escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 清除定时器
     */
    function clearTimer(): void {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    // 事件监听器
    document.addEventListener('mousemove', (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection?.toString() || '';
            
            if (text.trim()) {
                showTooltip(text);
            } else {
                hideTooltip();
            }
        }, 10);
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') hideTooltip();
    });

    document.addEventListener('click', (e: MouseEvent) => {
        if (tooltip && !tooltip.contains(e.target as Node)) {
            hideTooltip();
        }
    });

    document.addEventListener('scroll', hideTooltip);
    window.addEventListener('resize', hideTooltip);

    console.log('文字选择插件已加载');
})();
