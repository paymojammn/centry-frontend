/**
 * CallPay Checkout Widget - Production Version
 * Secure, modern, and robust implementation
 * 
 * @author Louis Germishuys <louis@callpay.com>
 * @version 4.0.0
 */

class EftSecureCheckout {
    constructor(options = {}) {
        // Validate required options
        if (!options.serviceUrl) {
            throw new Error('EftSecureCheckout: serviceUrl is required in options');
        }

        this.settings = {
            serviceUrl: options.serviceUrl,
            theme: 'generic',
            checkoutRedirect: true,
            primaryColor: null,
            secondaryColor: null,
            cardOptions: {
                rememberCard: false,
                rememberCardDefaultValue: false
            },
            paymentKey: null,
            paymentType: 'all',
            walletPayment: null,
            identificationType: null,
            identification: null,
            firstName: null,
            lastName: null,
            timeout: 300000, // 5 minutes
            onLoad: () => {},
            onHide: () => {},
            onComplete: (data) => {
                console.log('Transaction completed:', data);
            },
            onError: (error) => {
                console.error('Transaction error:', error);
            }
        };

        // Deep merge options
        this.settings = this._deepMerge(this.settings, options);

        // Validate and set allowed origin
        try {
            const url = new URL(this.settings.serviceUrl.replace('{protocol}', 'https'));
            this.allowedOrigin = url.origin;
        } catch (error) {
            throw new Error('EftSecureCheckout: Invalid serviceUrl provided');
        }

        // Validate identification options
        if (this.settings.identificationType !== null) {
            const allowedTypes = ['SAID', 'PASSPORT'];
            if (!allowedTypes.includes(this.settings.identificationType)) {
                throw new Error('EftSecureCheckout: identificationType must be "SAID" or "PASSPORT"');
            }
            if (!this.settings.identification || typeof this.settings.identification !== 'string' || this.settings.identification.trim().length === 0) {
                throw new Error('EftSecureCheckout: identification is required when identificationType is set');
            }
            // Sanitize identification to alphanumeric only
            this.settings.identification = this.settings.identification.replace(/[^A-Za-z0-9]/g, '');
        }

        // State management
        this.frame = null;
        this.iframe = null;
        this.initialBodyStyles = {};
        this.isInitialized = false;
        this.contextSent = false;
        this.messageNonce = this._generateNonce();
        this.timeoutId = null;
        this.resolvePromise = null;
        this.rejectPromise = null;
        this.originalOnComplete = null;

        // Bind methods
        this.handleMessage = this.handleMessage.bind(this);
        this.handleCloseClick = this.handleCloseClick.bind(this);
        this.handleIframeLoad = this.handleIframeLoad.bind(this);
        this.handleIframeError = this.handleIframeError.bind(this);
    }

    /**
     * Initialize the checkout process
     * @returns {Promise<Object>} Resolves with transaction data on success
     */
    init() {
        if (this.isInitialized) {
            return Promise.reject(new Error('Checkout already initialized'));
        }

        if (!this.settings.paymentKey) {
            return Promise.reject(new Error('paymentKey is required'));
        }

        // Validate payment key format (basic check)
        if (typeof this.settings.paymentKey !== 'string' || this.settings.paymentKey.length < 10) {
            return Promise.reject(new Error('Invalid paymentKey format'));
        }

        this.isInitialized = true;

        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;

            // Store original callback
            this.originalOnComplete = this.settings.onComplete;

            // Set timeout for transaction
            this.timeoutId = setTimeout(() => {
                this._cleanup();
                reject(new Error('Transaction timeout'));
            }, this.settings.timeout);

            try {
                this.storeInitialBodyStyles();
                this.injectCss();
                this.createFrame();
            } catch (error) {
                this._cleanup();
                reject(error);
            }
        });
    }

    /**
     * Create and inject the modal frame
     */
    createFrame() {
        const wrapper = document.createElement('div');
        wrapper.className = 'eftsecure-checkout-wrapper';
        wrapper.setAttribute('role', 'dialog');
        wrapper.setAttribute('aria-modal', 'true');
        wrapper.setAttribute('aria-label', 'Payment Checkout');

        const loader = document.createElement('div');
        loader.className = 'eftsecure-checkout-loader';
        loader.setAttribute('aria-live', 'polite');
        loader.setAttribute('aria-label', 'Loading checkout');

        const iframe = document.createElement('iframe');
        iframe.name = 'eftsecure_checkout_app';
        iframe.className = 'eftsecure-checkout-iframe';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowtransparency', 'true');
        iframe.setAttribute('allow', 'payment ' + this.allowedOrigin + ' https://pay.google.com');
        iframe.setAttribute('allowpaymentrequest', 'true');
        iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation');
        iframe.src = 'about:blank'; // Start with blank, will submit form to it

        // Set up event listeners
        iframe.addEventListener('load', this.handleIframeLoad);
        iframe.addEventListener('error', this.handleIframeError);

        // Assemble the frame
        wrapper.appendChild(loader);
        wrapper.appendChild(iframe);

        // Store references
        this.frame = wrapper;
        this.iframe = iframe;

        // Inject into DOM
        document.body.appendChild(this.frame);

        // Submit form after iframe is in DOM
        this.submitFormToIframe(iframe.name);

        // Listen for messages
        window.addEventListener('message', this.handleMessage);

        // Disable body scroll
        this.disableBodyScroll();
    }

    /**
     * Handle iframe load event
     */
    handleIframeLoad() {
        if (!this.frame || !this.iframe) return;

        this.frame.classList.add('loaded');

        try {
            this.settings.onLoad();
        } catch (error) {
            console.error('Error in onLoad callback:', error);
        }

        // The iframe fires 'load' twice: once for about:blank (same-origin),
        // then again after the form POST navigates to the CallPay domain.
        // Only send the context message when on the cross-origin CallPay domain.
        let iframeOnSameOrigin = false;
        try {
            const iframeOrigin = this.iframe.contentWindow && this.iframe.contentWindow.location.origin;
            if (iframeOrigin === window.location.origin || iframeOrigin === 'null') {
                iframeOnSameOrigin = true;
            }
        } catch (e) {
            // Cross-origin access throws — iframe is on CallPay domain, proceed
        }

        if (!iframeOnSameOrigin && !this.contextSent && this.iframe.contentWindow) {
            const message = {
                type: 'callpay-checkout-context',
                hostname: window.location.hostname,
                nonce: this.messageNonce,
                timestamp: Date.now()
            };
            try {
                this.iframe.contentWindow.postMessage(message, this.allowedOrigin);
                this.contextSent = true;
            } catch (e) {
                // Silently ignore — iframe may not be on the expected origin yet
            }
        }
    }

    /**
     * Handle iframe error
     */
    handleIframeError(error) {
        console.error('Iframe loading error:', error);
        this._completeTransaction({
            success: false,
            error: 'Failed to load checkout interface'
        });
    }

    /**
     * Handle close button click
     */
    handleCloseClick() {
        this._completeTransaction({
            success: false,
            cancelled: true,
            reason: 'User closed the modal'
        });
    }

    /**
     * Handle postMessage events
     */
    handleMessage(event) {
        // Strict origin validation
        if (event.origin !== this.allowedOrigin) {
            console.warn('Blocked message from untrusted origin:', event.origin);
            return;
        }

        const data = event.data;

        // Validate message structure
        if (!data || typeof data !== 'object') {
            return;
        }

        // Validate message has event type
        if (!data.event || typeof data.event !== 'string') {
            return;
        }

        // Process message based on event type
        switch (data.event) {
            case 'transactionComplete':
                this._completeTransaction(data.payload || { success: true });
                break;

            case 'transactionError':
                this._completeTransaction({
                    success: false,
                    error: data.payload?.error || 'Transaction failed',
                    ...data.payload
                });
                break;

            case 'close':
            case 'cancel':
                this.handleCloseClick();
                break;

            case 'resize':
                // Optional: handle iframe resize requests
                if (data.height && typeof data.height === 'number') {
                    this._resizeIframe(data.height);
                }
                break;

            default:
                console.log('Received unhandled event:', data.event);
        }
    }

    /**
     * Complete the transaction and cleanup
     */
    _completeTransaction(data) {
        if (!this.isInitialized) return;

        // Clear timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // Call original callback
        try {
            if (this.originalOnComplete) {
                this.originalOnComplete(data);
            }
        } catch (error) {
            console.error('Error in onComplete callback:', error);
        }

        // Resolve or reject promise
        if (data.success) {
            this.resolvePromise(data);
        } else {
            this.rejectPromise(data);
        }

        // Cleanup
        this.hideFrame();
    }

    /**
     * Hide and remove the frame
     */
    hideFrame() {
        if (!this.frame) return;

        // Remove event listeners
        if (this.iframe) {
            this.iframe.removeEventListener('load', this.handleIframeLoad);
            this.iframe.removeEventListener('error', this.handleIframeError);
        }

        window.removeEventListener('message', this.handleMessage);

        // Remove DOM elements
        this.frame.remove();
        this.frame = null;
        this.iframe = null;

        // Restore body scroll
        this.restoreBodyScroll();

        // Call onHide callback
        try {
            this.settings.onHide();
        } catch (error) {
            console.error('Error in onHide callback:', error);
        }

        this.isInitialized = false;
    }

    /**
     * Submit form data to iframe
     */
    submitFormToIframe(iframeTarget) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.target = iframeTarget;
        form.action = this.getServiceUrl();
        form.style.display = 'none';

        const fields = {
            payment_key: this.settings.paymentKey,
            payment_type: this.settings.paymentType,
            wallet_payment: this.settings.walletPayment,
            identification_type: this.settings.identificationType,
            identification: this.settings.identification,
            first_name: this.settings.firstName,
            last_name: this.settings.lastName,
            theme: this._sanitizeInput(this.settings.theme),
            remember_card: this.settings.cardOptions.rememberCard ? '1' : '0',
            remember_card_default: this.settings.cardOptions.rememberCardDefaultValue ? '1' : '0',
            nonce: this.messageNonce,
            origin: window.location.origin
        };

        // Create hidden inputs
        for (const [key, value] of Object.entries(fields)) {
            if (value !== null && value !== undefined) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(value);
                form.appendChild(input);
            }
        }

        document.body.appendChild(form);
        form.submit();

        // Clean up form immediately after submit
        // No setTimeout needed - submit is synchronous
        form.remove();
    }

    /**
     * Build the service URL with query parameters
     */
    getServiceUrl() {
        const proto = location.protocol === 'https:' ? 'https' : 'http';
        let url = this.settings.serviceUrl.replace('{protocol}', proto);

        const params = {
            checkout: '1',
            checkout_redirect: this.settings.checkoutRedirect ? '1' : '0',
            theme: this.settings.theme
        };

        // Add color parameters if valid
        if (this._isValidColor(this.settings.primaryColor)) {
            params['primary-color'] = this.settings.primaryColor;
        }

        if (this._isValidColor(this.settings.secondaryColor)) {
            params['secondary-color'] = this.settings.secondaryColor;
        }

        const queryString = new URLSearchParams(params).toString();
        return `${url}?${queryString}`;
    }

    /**
     * Inject required CSS styles
     */
    injectCss() {
        if (document.getElementById('eftsecure-checkout-styles')) return;

        const css = `
            .eftsecure-checkout-wrapper {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.6);
                z-index: 2147483647;
                opacity: 0;
                transition: opacity 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .eftsecure-checkout-wrapper.loaded {
                opacity: 1;
            }

            .eftsecure-checkout-iframe {
                width: 100%;
                height: 100%;
                border: none;
                background-color: transparent;
            }

            .eftsecure-checkout-loader {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                border: 5px solid rgba(255, 255, 255, 0.3);
                border-top: 5px solid #fff;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: eftsecure-spin 1s linear infinite;
            }

            .eftsecure-checkout-wrapper.loaded .eftsecure-checkout-loader {
                display: none;
            }

            @keyframes eftsecure-spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }

            body.eftsecure-modal-open {
                overflow: hidden !important;
            }

            /* Mobile optimizations */
            @media (max-width: 768px) {
                .eftsecure-checkout-wrapper {
                    background-color: rgba(0, 0, 0, 0.95);
                }
            }
        `;

        const style = document.createElement('style');
        style.id = 'eftsecure-checkout-styles';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    /**
     * Store initial body styles for restoration
     */
    storeInitialBodyStyles() {
        const body = document.body;
        this.initialBodyStyles = {
            overflow: body.style.overflow,
            position: body.style.position,
            top: body.style.top,
            width: body.style.width,
            height: body.style.height
        };

        // Store scroll position for iOS
        if (this._isIOS()) {
            this.initialBodyStyles.scrollPos = window.pageYOffset;
        }
    }

    /**
     * Disable body scrolling
     */
    disableBodyScroll() {
        const body = document.body;
        body.classList.add('eftsecure-modal-open');

        // iOS requires special handling
        if (this._isIOS()) {
            body.style.position = 'fixed';
            body.style.top = `-${this.initialBodyStyles.scrollPos}px`;
            body.style.width = '100%';
            body.style.height = '100%';
        }
    }

    /**
     * Restore body scrolling
     */
    restoreBodyScroll() {
        const body = document.body;
        body.classList.remove('eftsecure-modal-open');

        // Restore all stored styles
        Object.entries(this.initialBodyStyles).forEach(([key, value]) => {
            if (key !== 'scrollPos') {
                body.style[key] = value;
            }
        });

        // Restore scroll position on iOS
        if (this._isIOS() && this.initialBodyStyles.scrollPos !== undefined) {
            window.scrollTo(0, this.initialBodyStyles.scrollPos);
        }
    }

    /**
     * Cleanup method for error cases
     */
    _cleanup() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.hideFrame();
    }

    /**
     * Resize iframe (optional feature)
     */
    _resizeIframe(height) {
        if (this.iframe && height > 0 && height < 10000) {
            this.iframe.style.height = `${height}px`;
        }
    }

    /**
     * Generate a random nonce for message validation
     */
    _generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Deep merge two objects
     */
    _deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this._deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Sanitize input strings
     */
    _sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>\"']/g, '');
    }

    /**
     * Validate hex color format
     */
    _isValidColor(color) {
        if (!color || typeof color !== 'string') return false;
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    /**
     * Detect iOS devices using feature detection
     */
    _isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EftSecureCheckout;
}

// Global export for legacy support
if (typeof window !== 'undefined') {
    window.EftSecureCheckout = EftSecureCheckout;
}