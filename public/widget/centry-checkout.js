/**
 * Centry Checkout Widget SDK
 *
 * This script allows merchants to embed Centry Checkout on their websites.
 *
 * Usage:
 * 1. Include this script on your page:
 *    <script src="https://checkout.centry.io/widget/centry-checkout.js"></script>
 *
 * 2. Initialize and open checkout:
 *    CentryCheckout.open({
 *      sessionToken: 'your-session-token',
 *      onSuccess: function() { console.log('Payment successful!'); },
 *      onError: function(error) { console.error('Payment failed:', error); },
 *      onClose: function() { console.log('Checkout closed'); }
 *    });
 */

(function(window, document) {
  'use strict';

  var CHECKOUT_BASE_URL = 'https://checkout.centry.io';

  // Allow override for development
  if (window.CENTRY_CHECKOUT_URL) {
    CHECKOUT_BASE_URL = window.CENTRY_CHECKOUT_URL;
  }

  var CentryCheckout = {
    _modal: null,
    _iframe: null,
    _options: null,

    /**
     * Open the checkout modal
     * @param {Object} options Configuration options
     * @param {string} options.sessionToken The checkout session token
     * @param {function} [options.onSuccess] Callback when payment succeeds
     * @param {function} [options.onError] Callback when payment fails
     * @param {function} [options.onClose] Callback when modal is closed
     */
    open: function(options) {
      if (!options || !options.sessionToken) {
        console.error('CentryCheckout: sessionToken is required');
        return;
      }

      this._options = options;
      this._createModal(options.sessionToken);
      this._bindEvents();
      this._showModal();
    },

    /**
     * Close the checkout modal
     */
    close: function() {
      this._hideModal();
      if (this._options && this._options.onClose) {
        this._options.onClose();
      }
    },

    /**
     * Create the modal DOM elements
     */
    _createModal: function(sessionToken) {
      // Remove existing modal if any
      this._removeModal();

      // Create backdrop
      var backdrop = document.createElement('div');
      backdrop.id = 'centry-checkout-backdrop';
      backdrop.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity 0.2s ease;';

      // Create modal container
      var modal = document.createElement('div');
      modal.id = 'centry-checkout-modal';
      modal.style.cssText = 'position:relative;width:100%;max-width:448px;height:600px;max-height:90vh;background:white;border-radius:12px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);transform:scale(0.95);transition:transform 0.2s ease;';

      // Create close button
      var closeBtn = document.createElement('button');
      closeBtn.id = 'centry-checkout-close';
      closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;padding:8px;background:white;border:none;border-radius:50%;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
      closeBtn.setAttribute('aria-label', 'Close checkout');

      // Create loading indicator
      var loading = document.createElement('div');
      loading.id = 'centry-checkout-loading';
      loading.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:white;';
      loading.innerHTML = '<div style="width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:centry-spin 0.8s linear infinite;"></div>';

      // Add keyframes for spinner
      var style = document.createElement('style');
      style.textContent = '@keyframes centry-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);

      // Create iframe
      var iframe = document.createElement('iframe');
      iframe.id = 'centry-checkout-iframe';
      iframe.src = CHECKOUT_BASE_URL + '/checkout/' + sessionToken + '?embed=true';
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      iframe.setAttribute('allow', 'payment');
      iframe.setAttribute('title', 'Centry Checkout');

      // Assemble
      modal.appendChild(closeBtn);
      modal.appendChild(loading);
      modal.appendChild(iframe);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      // Store references
      this._modal = backdrop;
      this._iframe = iframe;

      // Hide loading when iframe loads
      var self = this;
      iframe.onload = function() {
        var loadingEl = document.getElementById('centry-checkout-loading');
        if (loadingEl) {
          loadingEl.style.display = 'none';
        }
      };
    },

    /**
     * Remove the modal from DOM
     */
    _removeModal: function() {
      if (this._modal && this._modal.parentNode) {
        this._modal.parentNode.removeChild(this._modal);
      }
      this._modal = null;
      this._iframe = null;
    },

    /**
     * Show the modal with animation
     */
    _showModal: function() {
      var self = this;
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Trigger animation
      requestAnimationFrame(function() {
        if (self._modal) {
          self._modal.style.opacity = '1';
          var modal = self._modal.querySelector('#centry-checkout-modal');
          if (modal) {
            modal.style.transform = 'scale(1)';
          }
        }
      });
    },

    /**
     * Hide the modal with animation
     */
    _hideModal: function() {
      var self = this;
      // Restore body scroll
      document.body.style.overflow = '';

      if (this._modal) {
        this._modal.style.opacity = '0';
        var modal = this._modal.querySelector('#centry-checkout-modal');
        if (modal) {
          modal.style.transform = 'scale(0.95)';
        }

        // Remove after animation
        setTimeout(function() {
          self._removeModal();
        }, 200);
      }
    },

    /**
     * Bind event listeners
     */
    _bindEvents: function() {
      var self = this;

      // Close button click
      var closeBtn = document.getElementById('centry-checkout-close');
      if (closeBtn) {
        closeBtn.onclick = function() {
          self.close();
        };
      }

      // Backdrop click
      if (this._modal) {
        this._modal.onclick = function(e) {
          if (e.target === self._modal) {
            self.close();
          }
        };
      }

      // Escape key
      this._escHandler = function(e) {
        if (e.key === 'Escape') {
          self.close();
        }
      };
      document.addEventListener('keydown', this._escHandler);

      // Message from iframe
      this._messageHandler = function(e) {
        // Only accept messages from checkout domain
        if (e.origin !== CHECKOUT_BASE_URL && e.origin !== window.location.origin) {
          return;
        }

        var data = e.data || {};
        var type = data.type;

        switch (type) {
          case 'centry:checkout:success':
            if (self._options && self._options.onSuccess) {
              self._options.onSuccess(data.data);
            }
            self._hideModal();
            break;

          case 'centry:checkout:error':
            if (self._options && self._options.onError) {
              self._options.onError(data.data ? data.data.message : 'Payment failed');
            }
            break;

          case 'centry:checkout:close':
            self.close();
            break;

          case 'centry:checkout:redirect':
            // Handle redirect for payment flows that require it
            if (data.data && data.data.url) {
              window.location.href = data.data.url;
            }
            break;
        }
      };
      window.addEventListener('message', this._messageHandler);
    },

    /**
     * Cleanup event listeners
     */
    _cleanup: function() {
      if (this._escHandler) {
        document.removeEventListener('keydown', this._escHandler);
        this._escHandler = null;
      }
      if (this._messageHandler) {
        window.removeEventListener('message', this._messageHandler);
        this._messageHandler = null;
      }
    }
  };

  // Expose globally
  window.CentryCheckout = CentryCheckout;

})(window, document);
