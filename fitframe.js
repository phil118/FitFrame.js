(function ($, window, document, undefined) {

  var PLUGIN_NAME = "fitFrame",
    INSTANCE_KEY = "plugin_" + PLUGIN_NAME,
    MODE_RESIZE = 'resize',
    MODE_WRAP = 'wrap';

  function FitFrame(element, options, defaults) {
    this.element = $(element);
    this.options = $.extend({}, defaults, options);

    this._defaults = defaults;
    this._init();
  }

  FitFrame.prototype = {

    // Fits any new iframes that have been added to the DOM since initialization
    update: function () {
      if (this.options.mode === MODE_RESIZE) {
        this._resizeNew();
      } else {
        this._calcWrapped();
        this._wrapNew();
      }
    },

    // Wraps a single iframe element (mode = 'wrap')
    wrap: function (iframe) {

      var width = $(iframe).data('width') || $(iframe).width();
      var height = $(iframe).data('height') || $(iframe).height();

      var padding = this._calculateRatio(width, height) * 100 + '%';

          if(this.options.limitToNativeWidth) {
            var limiter = $('<div class="fitframe-limit" style="max-width: '+width+'px"><div class="'+this.options.wrapperCssClass+'" style="padding-bottom: '+padding+'"></div></div>');
            return iframe.wrap(limiter).parent('.fitframe-limit');
          }
          else {
            var wrapper = $('<div/>')
            .addClass(this.options.wrapperCssClass)
            .css('padding-bottom', padding);
            // wrap the iframe and return the wrapper
            return iframe.wrap(wrapper).parent();
          }
    },

    // Initializes and resizes a single iframe element (mode = 'resize')
    resize: function (iframe) {

      this._setupIframe(iframe);

      this._resizeIframe(
        iframe, this.element.width(), this.element.height(), this.options.fitHeight);

      // return the resized iframe
      return iframe;
    },

    // Removes and cleans up fitFrame.js
    destroy: function () {
      var self = this;
      if (self.options.mode === MODE_RESIZE) {
        // remove iframe css classes
        this.element.find('iframe.' + this.options.iframeCssClass).each(function () {
          var data = $(this).data(PLUGIN_NAME);
          $(this).removeClass(self.options.iframeCssClass)
            .width(data.width)
            .height(data.height)
            .data(PLUGIN_NAME, null);
        });

        this._unbind();

      } else {

        // remove wrappers
        this.element.find('.' + this.options.wrapperCssClass).children().unwrap();
      }

      this.element.data(INSTANCE_KEY, null);
    },

    _init: function () {

      if (this.options.fitHeight) {
        // It's not possible to fit height in wrap mode so default to resize
        this.options.mode = MODE_RESIZE;
      }

      if (this.options.mode === MODE_RESIZE) {
        this._bind(); // binds to window resize
      }

      this.update();
    },

    _calcWrapped: function () {

      var self = this,

        iframes = self.element.find('iframe')
          .filter(function () {
            return $(this).closest('.' + self.options.wrapperCssClass).length;
          });

      iframes.each(function () {

        var iframe = this;

        var width = $(iframe).data('width') || $(iframe).attr('width');
        var height = $(iframe).data('height') || $(iframe).attr('height');

        var padding = self._calculateRatio(width, height) * 100 + '%';

        var wrapper = $(iframe).parent('.' + self.options.wrapperCssClass);

        wrapper.css('padding-bottom', padding);
        
      });

    },

    _wrapNew: function () {
      var self = this,
        // select iframes that haven't already been wrapped
        iframes = this.element.find('iframe')
          .filter(function () {
            return !$(this).closest('.' + self.options.wrapperCssClass).length;
          });

      iframes.each(function () {
        self.wrap($(this));
      });
    },

    _resizeNew: function () {
      var self = this;
      $('iframe').not(this.options.iframeCssClass).each(function () {
        self._setupIframe($(this));
      });
      this._resizeAll();
    },

    _setupIframe: function (iframe) {

      var width = $(iframe).data('width') || $(iframe).width();
      var height = $(iframe).data('height') || $(iframe).height();

      iframe
        .data(PLUGIN_NAME, {
          ratio: this._calculateRatio(width, height),
          width: width,
          height: height
        })
        .addClass(this.options.iframeCssClass);
    },

    // resizes all iframes that have been initialized by fitFrame.js
    _resizeAll: function () {

      var self = this,
        containerWidth = this.options.containerWidth.call(this),
        containerHeight = this.options.containerHeight.call(this),
        fitHeight = this.options.fitHeight;

      this.element.find('iframe.' + this.options.iframeCssClass).each(function () {
        self._resizeIframe($(this), containerWidth, containerHeight, fitHeight);
      });
    },

    _resizeIframe: function (iframe, containerWidth, containerHeight, fitHeight) {
      var ratio = iframe.data(PLUGIN_NAME).ratio,
        newHeight = containerWidth * ratio;

      if (fitHeight && newHeight > containerHeight) {
        // the new height would overlap the container height so scale the width instead
        iframe.height(containerHeight).width(containerHeight / ratio);
      } else {
        // scale the height (essentially what 'wrap' mode is doing)
        iframe.height(containerWidth * ratio).width('100%');
      }
    },

    _calculateRatio: function (width, height) {

      return ((height / width)).toPrecision(4);
    },

    _bind: function () {
      // debounced resizing
      var self = this,
        t;
      $(window).on('resize.' + PLUGIN_NAME, function () {
        clearTimeout(t);
        t = setTimeout(function () {
          self._resizeAll();
        }, 100);
      });
    },

    _unbind: function () {
      // remove all namespaced event handlers
      $(window).off('.' + PLUGIN_NAME);
    }
  };

  $.fn[PLUGIN_NAME] = function (options) {

    var args = arguments,
      returns;

    this.each(function () {

      var instance = $.data(this, INSTANCE_KEY);

      if (instance) {
        // check if invoking public methods
        if (typeof options === 'string' && options[0] !== '_') {
          var method = instance[options];
          if (typeof method === 'function') {
            returns = method.apply(instance, Array.prototype.slice.call(args, 1));
          } else {
            // method missing
            $.error('Public method \'' + options + '\' does not exist on jQuery.' + PLUGIN_NAME);
          }
        }

      } else {
        $.data(this, INSTANCE_KEY, new FitFrame(this, options, $.fn[PLUGIN_NAME].defaults));
      }
    });

    // if the earlier cached method has a value return it, otherwise return this to preserve chainability
    return returns !== undefined ? returns : this;
  };

  $.fn[PLUGIN_NAME].defaults = {
    wrapperCssClass: 'fitframe-wrap',
    iframeCssClass: 'fitframe',
    mode: MODE_WRAP,
    fitHeight: false,
    containerHeight: function () { return this.element.height(); },
    containerWidth: function () { return this.element.width(); },
    limitToNativeWidth: false
  };


})(jQuery, window, document);