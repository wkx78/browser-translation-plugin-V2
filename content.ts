// 文字选择显示和翻译插件

// Chrome扩展API类型声明
declare const chrome: any;

(() => {
    'use strict';

    /**
     * DeepSeek翻译服务类
     * 基于 DeepSeek API 文档: https://api-docs.deepseek.com/zh-cn/
     */
    class DeepSeekTranslator {
        private readonly apiKey: string;
        private readonly baseUrl: string = 'https://api.deepseek.com';
        private readonly model: string = 'deepseek-chat';
        private readonly timeout: number = 15000; // 15秒超时

        constructor(apiKey: string) {
            if (!apiKey || !apiKey.trim()) {
                throw new Error('DeepSeek API Key is required');
            }
            this.apiKey = apiKey.trim();
        }

        /**
         * 翻译文本
         * @param text 要翻译的文本
         * @param targetLanguage 目标语言 ('zh'=中文, 'en'=英文, 'ja'=日文等)
         * @returns Promise<翻译后的文本>
         */
        async translate(text: string, targetLanguage: string): Promise<string> {
            // 参数验证
            if (!text || !text.trim()) {
                throw new Error('翻译文本不能为空');
            }

            if (!targetLanguage) {
                throw new Error('目标语言不能为空');
            }

            if (text.trim().length > 150) {
                throw new Error('翻译文本不能超过150个字符');
            }

            try {
                // 构建翻译提示词
                const prompt = this.buildTranslationPrompt(text, targetLanguage);
                
                // 调用 DeepSeek API
                const response = await this.callDeepSeekAPI(prompt);
                
                // 提取翻译结果
                return this.extractTranslationResult(response, text);

            } catch (error) {
                console.error('DeepSeek翻译失败:', error);
                throw new Error(`翻译失败: ${error instanceof Error ? error.message : '未知错误'}`);
            }
        }

        /**
         * 构建翻译提示词
         * @param text 原文
         * @param targetLanguage 目标语言
         * @returns 构建好的提示词
         */
        private buildTranslationPrompt(text: string, targetLanguage: string): string {
            const languageMap: { [key: string]: string } = {
                'zh': '中文',
                'zh-cn': '中文',
                'en': '英文',
                'ja': '日文',
                'ko': '韩文',
                'fr': '法文',
                'de': '德文',
                'es': '西班牙文',
                'it': '意大利文',
                'ru': '俄文'
            };

            const targetLangName = languageMap[targetLanguage.toLowerCase()] || targetLanguage;

            return `请将以下文本翻译成${targetLangName}，只返回翻译结果，不要添加任何解释或其他内容：${text}`;
        }

        /**
         * 调用 DeepSeek API
         * @param prompt 提示词
         * @returns API响应结果
         */
        private async callDeepSeekAPI(prompt: string): Promise<any> {
            // 构建请求体 (符合 OpenAI 兼容格式)
            const requestBody = {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的翻译助手，专注于提供准确、自然的翻译。请直接返回翻译结果，不要添加任何解释。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: false, // 非流式输出
                temperature: 0.3, // 较低的随机性，确保翻译稳定
                max_tokens: 1000 // 限制输出长度
            };

            // 设置请求头
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            };

            // 创建超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            try {
                // 发送请求
                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                // 清除超时定时器
                clearTimeout(timeoutId);

                // 检查响应状态
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`API请求失败 (${response.status}): ${errorData.error?.message || response.statusText}`);
                }

                // 解析响应
                const data = await response.json();
                return data;

            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error('请求超时，请检查网络连接');
                }
                
                throw error;
            }
        }

        /**
         * 从API响应中提取翻译结果
         * @param response API响应
         * @param originalText 原文本
         * @returns 翻译结果
         */
        private extractTranslationResult(response: any, originalText: string): string {
            try {
                // 检查响应格式
                if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
                    throw new Error('API响应格式错误：缺少choices字段');
                }

                const choice = response.choices[0];
                if (!choice.message || !choice.message.content) {
                    throw new Error('API响应格式错误：缺少消息内容');
                }

                let translatedText = choice.message.content.trim();

                // 简单的结果清理
                if (!translatedText) {
                    throw new Error('翻译结果为空');
                }

                // 如果翻译结果和原文相同，可能是同一语言
                if (translatedText === originalText) {
                    return originalText; // 直接返回原文
                }

                return translatedText;

            } catch (error) {
                console.error('解析翻译结果失败:', error);
                throw new Error('解析翻译结果失败');
            }
        }

        /**
         * 检查API密钥是否有效
         * @returns Promise<boolean>
         */
        async validateApiKey(): Promise<boolean> {
            try {
                await this.translate('Hello', 'zh');
                return true;
            } catch (error) {
                return false;
            }
        }
    }

    // 全局变量
    let tooltip: HTMLDivElement | null = null;
    let hideTimer: number | null = null;
    let mouseX = 0;
    let mouseY = 0;
    let translator: DeepSeekTranslator | null = null;

    // 配置常量
    const CONFIG = {
        MAX_TEXT_LENGTH: 100,
        HIDE_DELAY: 40000,
        ANIMATION_DELAY: 200,
        TOOLTIP_OFFSET: 15
    };

    // 初始化翻译服务
    async function initTranslator(): Promise<void> {
        try {
            // 从chrome.storage.local读取API密钥
            const result = await chrome.storage.local.get(['deepseek_api_key']);
            const apiKey = result.deepseek_api_key;
            
            if (apiKey && apiKey.trim()) {
                translator = new DeepSeekTranslator(apiKey);
                console.log('DeepSeek翻译服务已初始化');
            } else {
                translator = null;
                console.log('未设置DeepSeek API密钥，翻译功能未启用');
            }
        } catch (error) {
            console.error('初始化翻译服务失败:', error);
            translator = null;
        }
    }

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
    async function showTooltip(text: string): Promise<void> {
        if (!text?.trim()) {
            hideTooltip();
            return;
        }

        const element = createTooltip();
        const cleanText = text.trim();
        const displayText = cleanText.length > CONFIG.MAX_TEXT_LENGTH
            ? cleanText.substring(0, CONFIG.MAX_TEXT_LENGTH) + '...'
            : cleanText;

        // 设置基本内容
        element.innerHTML = `
            <div class="selected-text">${escapeHtml(displayText)}</div>
            <div class="text-info">${cleanText.length} 个字符</div>
            ${translator ? '<div class="translation-loading">DeepSeek 翻译中...</div>' : '<div class="translation-disabled">未设置API密钥</div>'}
        `;

        // 设置位置
        setTooltipPosition(element);

        // 显示动画
        requestAnimationFrame(() => element.classList.add('show'));

        // 如果有翻译服务，进行翻译
        if (translator) {
            try {
                const translatedText = await translator.translate(cleanText, 'zh');
                
                // 更新为翻译结果
                element.innerHTML = `
                    <div class="selected-text">${escapeHtml(displayText)}</div>
                    <div class="text-info">${cleanText.length} 个字符</div>
                    <div class="translation-text">${escapeHtml(translatedText)}</div>
                `;
            } catch (error) {
                console.error('Translation failed:', error);
                // 显示错误信息
                element.innerHTML = `
                    <div class="selected-text">${escapeHtml(displayText)}</div>
                    <div class="text-info">${cleanText.length} 个字符</div>
                    <div class="translation-error">❌ 翻译失败: ${error instanceof Error ? error.message : '未知错误'}</div>
                `;
            }
        }

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

    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((message: any) => {
        if (message.type === 'API_KEY_UPDATED') {
            console.log('API密钥更新，重新初始化翻译服务');
            // API密钥更新，重新初始化翻译服务
            initTranslator();
        }
    });

    document.addEventListener('scroll', hideTooltip);
    window.addEventListener('resize', hideTooltip);

    // 初始化翻译服务
    initTranslator();

    console.log('DeepSeek 文字选择和翻译插件已加载');
})();