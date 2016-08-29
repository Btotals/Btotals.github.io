'use strict';

/**
 * Guide & Tips & Simple Event Trigger
 * author: totalxiao
 *
 * 首先:
 *   var Guide = require('lib/guide/guide.js');
 *
 * 然后:
 *   为目标html元素添加
 *   class = "js_guide_tip"
 *   tip-index = "1" (此处数字务必确保按照tip出现顺序升序，用于定义tip的跳转顺序)
 *   tip-direction = "top" or "bottom" or "left" or "right"
 *
 *   eg:
 *     <a href="#" class="js_guide_tip" tip-index="1" tip-direction="top">test text 1</a>
 *     <a href="#" class="js_guide_tip" tip-index="2" tip-direction="right">test text 2</a>
 *
 * 之后编写对应的tip文本，此处序号必须与html中的tip-index逐一对应:
 *  var options = {
 *    1: {
 *      title: "添加企业号",
 *      text: "添加单个或导入多个企业号，与这些企业号进行信息互通",
 *      direction: "left"
 *    }, 2: {
 *      title: "添加企业号2",
 *      text: "添加单个或导入多个企业号，与这些企业号进行信息互通2"
 *    }
 *  }
 *
 *  最后使用new实例化Guide即可:
 *    guide = new Guide("wx-guide", options);
 *
 *  可以使用 next/prev 方法导航到上一条/下一条
 *  可以使用 start/end 方法控制Guide导引开始/结束
 *  可以使用 showTip/hideTip 方法控制当前tip的显示与隐藏
 *
 *  使用完成后调用destroy析构方法从页面上移除所有tip
 *
 *  guide提供on方法注册handler事件处理器，并提供off方法移除，以及trigger方法手动触发
 *
 *  on的几个对应事件: destroy/start/end/tipShow/tipHide
 *  从左往右，分别对应Guide被实例化、被析构、开始引导、结束引导、显示tip、隐藏tip
 *
 *  事件接口格式:
 *    .on(eventName, callback)
 *
 *    .off([eventName] [,handlerId])
 *
 *    .trigger(eventName)
 *
 *  监听guide的end事件并处理, handlerId存储传入handler函数对应的唯一Id值:
 *  var handlerId = guide.on('end', function(tipIndex){});
 *
 *  移除所有handler:
 *  guide.off();
 *
 *  移除start事件的所有handler:
 *  guide.off('start');
 *
 *  移除某一个特定handler:
 *  guide.off(handlerId);
 *
 *  手动触发start事件的所有handler:
 *  guide.trigger('start');
 *
 *
 *  新更新：提供customConfig的钩子方法，可以在传入的options内增加customConfig函数，实现某些自定义的配置
 *  eg: 让组件在页面url的hash部分变化的时候destroy
 *
 *  customConfig: function() {
 *    var self = this;
 *    $(window).on('hashchange', function(){
 *      console.log('hashchange, guide would be destroy!');
 *      self.destroy();
 *    });
 *  }
 *
 */

define(function(require, exports, module) {

  var Guide = (function(){
    Guide.displayName = 'Guide';
    var prototype = Guide.prototype, constructor = Guide;

    /**
     * constructor
     * @param {Array} options
     */
    function Guide(name, options){
      if (options === undefined && typeof name === 'object') {
        options = name;
        name = 'untitled';
      }
      this.name = name;
      this.options = options;

      this.getAllTarget();
      this.createTips();

      // 创建对应的事件分派代理
      this.emitter = new Emitter(name);
      this.on = Function.call.bind(this.emitter.on, this.emitter);
      this.off = Function.call.bind(this.emitter.off, this.emitter);
      this.trigger = Function.call.bind(this.emitter.trigger, this.emitter);

      this.running = false;
      this.currentTipIndex = 0;
      this.totalTips = this.tips.length;

      this.customConfig();
    }

    // 获取全部带有 js_guide_tip 类名的 target dom
    prototype.getAllTarget = function(){
      this.$targets = $('.js_guide_tip');
      this.targets = [].slice.apply(this.$targets);
    };

    prototype.createTips = function(){
      var self = this;
      var map = Function.prototype.call.bind([].map);

      // 从target dom处获取index下标信息以及方向direction信息
      this.tips = map(this.$targets, function(target){
        var $target, tipIndex, direction;
        $target = $(target);
        tipIndex = $target.attr('tip-index');
        direction = $target.attr('tip-direction');

        if (direction) {
          self.options[tipIndex].direction = direction;
        }

        return new Tip({
          guide: self,
          $target: $target,
          index: tipIndex,
          option: self.options[tipIndex]
        });
      });

      this.tips.sort(function(tipA, tipB) {
        return parseInt(tipA.index) - parseInt(tipB.index);
      });

      this.tips[this.tips.length - 1].$tip.find('.mod-bubble__next').text('完成');
    };

    // 从头开始guide
    prototype.start = function(){
      if (this.running) {
        return;
      }

      this.running = true;
      this.currentTipIndex = 0;

      this.trigger('start', this.currentTipIndex);

      this.showTip();
    };

    // 结束当前guide
    prototype.end = function(){
      if (!this.running) {
        return;
      }

      this.running = false;
      this.hideTip();

      if (this.currentTipIndex === this.totalTips)
        this.trigger('end', this.currentTipIndex - 1);
      else
        this.trigger('end', this.currentTipIndex);

      this.currentTipIndex = null;
    };

    // 析构函数，销毁所有页面上的tip，并移除对应的事件handler
    prototype.destroy = function() {
      this.end();
      this.trigger('destroy', null);

      this.tips.forEach(function(tip){
        tip.destroy();
      });
    }

    // 导航至下一条
    prototype.next = function(){
      this.hideTip();
      this.currentTipIndex++;

      if (this.currentTipIndex < this.totalTips) {
        this.showTip();
      } else {
        this.end();
      }
    };

    // 导航至前一条
    prototype.prev = function(){
      this.hideTip();
      this.currentTipIndex--;

      if (this.currentTipIndex >= 0) {
        this.showTip();
      } else {
        return;
      }
    };

    prototype.showTip = function(){
      if (!this.running) {
        throw new Error("Guide " + this.name + " is not running!");
      }

      this.trigger('showTip', this.currentTipIndex);

      this.tips[this.currentTipIndex].show();
      this.scrollToTip(this.tips[this.currentTipIndex]);
    };

    prototype.hideTip = function(){
      var currentTip;
      currentTip = this.tips[this.currentTipIndex];

      if (currentTip && currentTip.visible) {
        this.trigger('hideTip', this.currentTipIndex);
        currentTip.hide();
      }
    };

    // 滚动窗口到tip的target元素所在位置
    // 默认情况下让target元素在屏幕上居中
    prototype.scrollToTip = function(tip, position){
      var scrollTop, windowHeight;
      position == null && (position = 'center');
      scrollTop = tip.$target.offset().top;

      switch (position) {
        case 'center':
          windowHeight = $(window).height();
          scrollTop -= windowHeight / 2;
          break;
        case 'top':
          scrollTop -= tip.$tip.height();
      }

      $('html, body').animate({
        scrollTop: scrollTop
      }, 1000);
    };

    prototype.customConfig = function(){
      var customConfig = this.options.customConfig
      if (customConfig && typeof customConfig === 'function') {
        customConfig.call(this);
      }
    }

    return Guide;
  }());

  var Tip = (function(){
    Tip.displayName = 'Tip';
    var prototype = Tip.prototype, constructor = Tip;

    // 从上到下分别是tip元素的默认z-index、默认的箭头长度、默认的padding宽度
    Tip.defaultZIndex = 100;
    Tip.arrowOffset = 10;
    Tip.tipPaddingOffset = 20;

    // 默认tip模板，可通过setTemplate方法替换
    Tip.template = require('./tip.html');

    // 用于将传入的options编译成html字符串
    Tip.compile = function(template, option){
      var matches = template.match(/#\{\w+\}/g);

      matches.forEach(function(item){
        // match item is #{xxx}
        // slice to xxx
        var itemName = item.slice(2, -1);
        template = template.replace(item, option[itemName]);
      });

      return template;
    };

    Tip.setTemplate = function(newTemplate) {
      Tip.template = newTemplate;
    }

    /**
     * constructor
     * @param {Object} option use to config tip
     */
    function Tip(option){
      this.guide = option.guide, this.index = option.index, this.$target = option.$target, this.option = option.option;
      this.zIndex = (option.zIndex != null) ? option.zIndex : this.constructor.defaultZIndex;
      this.target = this.$target[0];
      this.visible = false;

      this.createTip();
      this._configTipOffset();
      this._configTargetOffset();
      this._setupEvents();
    }

    // 创建tip对应的dom元素，并append到body
    prototype.createTip = function(){
      this.$tip = $(this.constructor.compile(this.constructor.template, this.option));

      // 将方向的首字母大写（都是CSS类名坑爹的锅）
      var direction = this.option.direction.replace(/^\w/, function(letter) {return letter.toUpperCase();});

      this.$tip.attr({
        id: "guide-tip-" + this.index
      }).css({
        zIndex: this.zIndex,
        display: "none"
      }).addClass("mod-bubble" + direction);

      this.tip = this.$tip[0];
      $(document.body).append(this.tip);
    };

    // 计算tip的长宽
    prototype._configTipOffset = function(){
      this.tipWidth = this.$tip.outerWidth();
      this.tipHeight = this.$tip.outerHeight();
    };

    // 计算target的长宽
    prototype._configTargetOffset = function(){
      this.targetOffset = this.$target.offset();
      this.targetWidth = this.$target.outerWidth();
      this.targetHeight = this.$target.outerHeight();
    };

    // 绑定点击事件
    prototype._setupEvents = function(){
      var self = this;

      this.$tip.on('click', '.mod-bubble__next', function(e){
        return self.guide.next();
      });

      this.$tip.on('click', '.mod-bubble__close', function(e){
        return self.guide.end();
      });
    };

    // 根据箭头方向计算tip的offset
    prototype._offset = function(){
      switch (this.option.direction) {
        case 'right':
          return {
            left: this.targetOffset.left + this.targetWidth + this.constructor.arrowOffset,
            top: this.targetOffset.top + this.targetHeight / 2 - this.constructor.arrowOffset - this.constructor.tipPaddingOffset
          };
        case 'left':
          return {
            left: this.targetOffset.left - this.tipWidth - this.constructor.arrowOffset,
            top: this.targetOffset.top + this.targetHeight / 2 - this.constructor.arrowOffset - this.constructor.tipPaddingOffset
          };
        case 'top':
          return {
            left: this.targetOffset.left + this.targetWidth / 2 - this.tipWidth + this.constructor.arrowOffset + this.constructor.tipPaddingOffset,
            top: this.targetOffset.top - this.targetHeight - this.tipHeight
          };
        case 'bottom':
          return {
            left: this.targetOffset.left + this.targetWidth / 2 - this.constructor.arrowOffset - this.constructor.tipPaddingOffset,
            top: this.targetOffset.top + this.targetHeight + this.constructor.arrowOffset
          };
      }
    };

    // 将{top: 100, left: 100}转换成{top: "100px", left: "100px"}
    prototype._offsetHelper = function(offset){
      var direction, value;

      for (direction in offset) {
        value = offset[direction];
        offset[direction] = value.toString() + "px";
      }

      return offset;
    };

    prototype.show = function(){
      this.visible = true;
      this.$tip.css(this._offsetHelper(this._offset()));
      this.$tip.fadeIn();
    };

    prototype.hide = function(){
      this.visible = false;
      this.$tip.fadeOut();
    };

    prototype.destroy = function(){
      this.$tip.off();
      this.$tip.remove();
    }

    return Tip;
  }());




  var Emitter = (function(){
    Emitter.displayName = 'Emitter';
    var prototype = Emitter.prototype, constructor = Emitter;
    Emitter._sequenceArrayKey = Symbol('queueArrayKey');
    Emitter._sequenceIdKey = Symbol('sequence-id');

    /**
     * 简单的事件分派发射控制
     * @param {string} name    [名字]
     * @param {object} options [可选配置，留待将来扩展]
     */
    function Emitter(name, options){
      this.name = name;
      if (!options) {
        this.options = {};
      }
    }

    prototype._eventQueue = {};

    /**
     * 用于添加对应事件的handler
     * @param  {string} eventName [事件名称]
     * @param  {function} handler [事件的handler]
     * @return {symbol}           [用于唯一确定某个handler的Id]
     */
    prototype.on = function(eventName, handler){
      return this._addHandler(eventName, handler);
    };

    /**
     * 用于移除事件对应handler
     * @param  {string} eventName [要移除handler的事件]
     * @param  {symbol} handlerId [要被移除handler的Id]
     */
    prototype.off = function(eventName, handlerId){
      var targetQueue, name, queue;
      // 重新排列参数
      if (typeof eventName === 'symbol') {
        handlerId = eventName;
        eventName = undefined;
      }

      targetQueue = this._eventQueue[eventName];
      if (eventName === undefined) {
        // 如果两个参数均未提供，直接清空所有事件队列，相当于destroy
        if (handlerId === undefined) {
          this._eventQueue = {};
        } else {
          // 如果只提供handlerId，则搜索所有事件队列，移除对应的某个handler
          for (name in this._eventQueue) {
            queue = this._eventQueue[name];
            this._removeHandler(queue, queue[this.constructor._sequenceArrayKey], handlerId);
          }
        }
      } else if (targetQueue) {
        sequence = targetQueue[this.constructor._sequenceArrayKey];
        // 如果两个参数都有提供，那么在对应的事件队列中删除对应handler
        if (handlerId) {
          this.remove(targetQueue, sequence, handlerId);
        } else {
          // 否则清空eventName对应的事件队列
          var self = this;

          sequence.forEach(function(handlerId){
            self._removeHandler(targetQueue, sequence, handlerId);
          });
        }
      }

    };

    /**
     * 用于触发某个事件，执行事件队列中所有的handler，执行顺序与注册顺序一致
     * @param  {string} eventName [要被触发的事件名]
     * @param  {Any} data         [将被传入回调函数的数据]
     */
    prototype.trigger = function(eventName, data){
      var queue, sequenceArray;

      queue = this._eventQueue[eventName];
      if (!queue) return;

      sequenceArray = queue[this.constructor._sequenceArrayKey];
      sequenceArray.forEach(function(handlerId){
        queue[handlerId](data);
      });
    };

    // 用于析构，Alias for off()
    prototype.destroy = function() {
      this.off();
    }

    /**
     * 为事件队列注册handler
     * @param {string} eventName [要注册handler的事件名]
     * @param {function} handler [要注册的handler]
     * @return {symbol}          [注册的handler对应的唯一Id]
     */
    prototype._addHandler = function(eventName, handler){
      var queue, handlerId;
      queue = this._eventQueue[eventName];

      if (!queue) {
        // 保存handler的字典，键值对是{symbol: Function}
        this._eventQueue[eventName] = queue = {};
        // 用于记录handler注册顺序的数组
        queue[this.constructor._sequenceArrayKey] = [];
        queue[this.constructor._sequenceIdKey] = 0;
      }

      // handlerId: eventName#id, eg: showTip#1
      handlerId = Symbol(eventName + "#" + (queue[this.constructor._sequenceIdKey]++).toString());
      queue[handlerId] = handler;
      queue[this.constructor._sequenceArrayKey].push(handlerId);

      return handlerId;
    };

    /**
     * 根据handlerId移除事件队列中的handler
     * @param  {object} queue     [事件队列]
     * @param  {Array}  sequence  [保存handlerId的数组，用于记录handler注册的顺序]
     * @param  {symbol} handlerId [唯一标识某个handler的Id]
     * @return {boolean}          [是否成功移除]
     */
    prototype._removeHandler = function(queue, sequence, handlerId){
      if (queue[handlerId]) {
        delete queue[handlerId];
        sequence.splice(sequence.indexOf(handlerId));
        return true;
      }
      return false;
    };

    return Emitter;

  }());

  module.exports = Guide;

});

